import { NextResponse } from 'next/server';
import { verifyPagSeguroSignature } from '../../../../src/server/payments/pagseguro-client';
import { prisma } from '../../../../src/server/db/client';
import { markOrderPaid } from '../../../../src/server/payments/mark-order-paid';
import { sendEmail, buildEmailFromTemplate } from '../../../../src/server/utils/email';
import { rateLimitByRequest } from '../../../../src/server/utils/rate-limit';
import { logAudit, logSecurityEvent } from '../../../../src/server/utils/audit-logger';

type PagSeguroPayload = {
  provider_reference: string;
  status: string;
  amount?: number;
  order_id?: string;
};

const statusMap: Record<string, string> = {
  paid: 'paid',
  completed: 'paid',
  authorized: 'pending',
  pending: 'pending',
  waiting: 'pending',
  in_analysis: 'pending',
  canceled: 'cancelled',
  cancelled: 'cancelled',
  declined: 'cancelled',
  failed: 'cancelled',
  refunded: 'refunded',
  chargeback: 'refunded',
};

/**
 * Webhook do PagSeguro com verificação de assinatura, idempotência e logging básico.
 */
export async function POST(req: Request) {
  const limit = await rateLimitByRequest(req, { prefix: 'webhook:pagseguro:', limit: 100, windowMs: 60_000 });
  if (!limit.allowed) {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    logSecurityEvent('security.rate_limited', ip, { scope: 'webhook:pagseguro' });
    return NextResponse.json({ error: 'rate limit' }, { status: 429, headers: limit.headers });
  }

  const secret = process.env.PAGSEGURO_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'PAGSEGURO_WEBHOOK_SECRET ausente' }, { status: 500 });

  const rawBody = await req.text();
  const valid = verifyPagSeguroSignature(req.headers, rawBody, secret);
  if (!valid) return NextResponse.json({ error: 'assinatura inválida' }, { status: 401, headers: limit.headers });

  let payload: PagSeguroPayload;
  try {
    payload = JSON.parse(rawBody || '{}');
  } catch (err) {
    return NextResponse.json({ error: 'json inválido' }, { status: 400 });
  }

  const providerReference = payload?.provider_reference;
  if (!providerReference) return NextResponse.json({ error: 'provider_reference ausente' }, { status: 400, headers: limit.headers });

  logAudit({
    action: 'payment.webhook_received',
    targetType: 'payment',
    targetId: providerReference,
    metadata: { provider: 'pagseguro' },
  });

  const normalizedStatus = statusMap[payload.status?.toLowerCase?.()] || 'unknown';

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({ where: { providerReference } });
    let orderId: string | null = existing?.orderId ?? payload.order_id ?? null;
    let orderStatus: string | null = null;

    // Idempotência: se status não mudou, apenas loga e encerra.
    if (existing?.status === normalizedStatus) {
      await tx.paymentWebhookLog.create({
        data: {
          provider: 'pagseguro',
          providerReference,
          status: normalizedStatus,
          rawBody,
        },
      });
      return { state: 'duplicate', paymentId: existing.id, status: normalizedStatus, orderId, orderStatus };
    }

    const payment = await tx.payment.upsert({
      where: { providerReference },
      update: {
        status: normalizedStatus,
        amount: payload.amount,
        payloadJson: payload as any,
        lastWebhookAt: new Date(),
      },
      create: {
        provider: 'pagseguro',
        providerReference,
        status: normalizedStatus,
        amount: payload.amount,
        payloadJson: payload as any,
        orderId: payload.order_id ?? existing?.orderId ?? null,
      },
    });

    await tx.paymentWebhookLog.create({
      data: {
        provider: 'pagseguro',
        providerReference,
        status: normalizedStatus,
        rawBody,
      },
    });

    if (normalizedStatus === 'paid') {
      const paidOrder = await markOrderPaid({ paymentId: payment.id, tx });
      orderId = paidOrder?.id ?? orderId;
      orderStatus = paidOrder?.status ?? 'paid';
    }

    if (normalizedStatus === 'cancelled' || normalizedStatus === 'refunded') {
      const targetOrderId = payment.orderId ?? payload.order_id;
      if (targetOrderId) {
        const order = await tx.order.findUnique({ where: { id: targetOrderId } });

        if (order) {
          if (order.status === 'paid' && normalizedStatus === 'cancelled') {
            return { state: 'ignored-after-paid', paymentId: payment.id, status: normalizedStatus, orderId: targetOrderId, orderStatus: order.status };
          }

          if (order.status !== normalizedStatus) {
            await tx.order.update({
              where: { id: targetOrderId },
              data: { status: normalizedStatus },
            });

            await tx.orderEvent.create({
              data: {
                orderId: targetOrderId,
                action: normalizedStatus === 'cancelled' ? 'cancelled' : 'status_changed',
                payload: {
                  status: normalizedStatus,
                  reason: payload.status,
                },
              },
            });
            orderId = targetOrderId;
            orderStatus = normalizedStatus;
          }
        }
      }
    }

    return { state: 'processed', paymentId: payment.id, status: normalizedStatus, orderId, orderStatus };
  });

  if (result?.orderId && (result.orderStatus === 'paid' || result.orderStatus === 'cancelled' || result.orderStatus === 'refunded')) {
    const order = await prisma.order.findUnique({
      where: { id: result.orderId },
      include: {
        user: true,
        items: true,
      },
    });

    if (order?.user?.email) {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const orderUrl = `${baseUrl}/order/${order.id}/confirmation`;

      if (result.orderStatus === 'paid') {
        const formattedTotal = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(order.total);

        const itemsCountBlock = order.items.length
          ? `<p>Total de itens: <strong>${order.items.length}</strong></p>`
          : '';
        const itemsCountText = order.items.length ? `Total de itens: ${order.items.length}\n` : '';

        const emailContent = await buildEmailFromTemplate('order.paid', {
          userName: order.user.name ? ` ${order.user.name}` : '',
          orderId: order.id,
          formattedTotal,
          orderUrl,
          itemsCountBlock,
          itemsCountText,
        });
        await sendEmail({
          to: order.user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      } else {
        const reason = result.orderStatus === 'refunded' ? 'Reembolsado' : 'Pagamento não confirmado';
        const reasonBlock = reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : '';
        const reasonText = reason ? `Motivo: ${reason}\n` : '';

        const emailContent = await buildEmailFromTemplate('order.cancelled', {
          userName: order.user.name ? ` ${order.user.name}` : '',
          orderId: order.id,
          orderUrl,
          reasonBlock,
          reasonText,
        });
        await sendEmail({
          to: order.user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      }
    }
  }

  return NextResponse.json({ ok: true, providerReference, result }, { headers: limit.headers });
}
