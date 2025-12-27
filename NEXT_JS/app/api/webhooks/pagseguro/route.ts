import { NextResponse } from 'next/server';
import { verifyPagSeguroSignature } from '../../../../src/server/payments/pagseguro-client';
import { prisma } from '../../../../src/server/db/client';
import { markOrderPaid } from '../../../../src/server/payments/mark-order-paid';

type PagSeguroPayload = {
  provider_reference: string;
  status: string;
  amount?: number;
  order_id?: string;
};

const statusMap: Record<string, string> = {
  paid: 'paid',
  completed: 'paid',
  authorized: 'authorized',
  pending: 'pending',
  canceled: 'canceled',
  refunded: 'refunded',
  chargeback: 'chargeback',
};

/**
 * Webhook do PagSeguro com verificação de assinatura, idempotência e logging básico.
 */
export async function POST(req: Request) {
  const secret = process.env.PAGSEGURO_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'PAGSEGURO_WEBHOOK_SECRET ausente' }, { status: 500 });

  const rawBody = await req.text();
  const valid = verifyPagSeguroSignature(req.headers, rawBody, secret);
  if (!valid) return NextResponse.json({ error: 'assinatura inválida' }, { status: 401 });

  let payload: PagSeguroPayload;
  try {
    payload = JSON.parse(rawBody || '{}');
  } catch (err) {
    return NextResponse.json({ error: 'json inválido' }, { status: 400 });
  }

  const providerReference = payload?.provider_reference;
  if (!providerReference) return NextResponse.json({ error: 'provider_reference ausente' }, { status: 400 });

  const normalizedStatus = statusMap[payload.status?.toLowerCase?.()] || 'unknown';

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({ where: { providerReference } });

    // Idempotência simples: se já está pago e o novo status também é pago, ignore.
    if (existing?.status === 'paid' && normalizedStatus === 'paid') {
      await tx.paymentWebhookLog.create({
        data: {
          provider: 'pagseguro',
          providerReference,
          status: normalizedStatus,
          rawBody,
        },
      });
      return { state: 'already-paid', paymentId: existing.id };
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
      await markOrderPaid({ paymentId: payment.id, tx });
    }

    return { state: 'processed', paymentId: payment.id, status: normalizedStatus };
  });

  return NextResponse.json({ ok: true, providerReference, result });
}
