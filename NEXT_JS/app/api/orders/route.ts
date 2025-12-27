import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../src/server/auth/options';
import { prisma } from '../../../src/server/db/client';
import { rateLimitByRequest } from '../../../src/server/utils/rate-limit';
import { CheckoutError, prepareOrderItems, sanitizeTotals } from '../../../src/server/orders/checkout';
import { captureError, logger } from '../../../src/server/utils/logger';

const TAX_RATE = Number(process.env.TAX_RATE ?? 0); // ex: 0.1 = 10%

export async function POST(req: Request) {
  const correlationId = req.headers.get('x-correlation-id') ?? 'unknown';
  const limit = await rateLimitByRequest(req, { prefix: 'orders:create:', limit: 15, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'muitas requisições' }, { status: 429, headers: limit.headers });
  }

  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'não autenticado' }, { status: 401, headers: limit.headers });
  }

  const body = await req.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length) {
    return NextResponse.json({ error: 'items obrigatórios' }, { status: 400, headers: limit.headers });
  }

  const productIds = items.map((i: any) => i.productId).filter(Boolean);
  const variantIds = items.map((i: any) => i.variantId).filter(Boolean);

  const [products, variants] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, price: true, active: true } }),
    prisma.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, productId: true, price: true, stock: true } }),
  ]);

  let prepared;
  try {
    prepared = prepareOrderItems(items, products, variants);
  } catch (err) {
    if (err instanceof CheckoutError) {
      logger.warn('checkout rejected', { correlationId, code: err.code, message: err.message });
      return NextResponse.json({ error: err.message }, { status: 400, headers: limit.headers });
    }
    throw err;
  }

  const shippingRequested = Number(body?.shippingTotal ?? 0);
  const discountRequested = Number(body?.discountTotal ?? 0);
  const totals = sanitizeTotals(prepared.subtotal, shippingRequested, discountRequested, TAX_RATE);

  try {
    const order = await prisma.$transaction(async (tx) => {
      for (const it of prepared.orderItems) {
        if (!it.variantId) continue;
        const updated = await tx.productVariant.updateMany({
          where: { id: it.variantId, stock: { gte: it.quantity } },
          data: { stock: { decrement: it.quantity } },
        });
        if (updated.count === 0) {
          throw new CheckoutError('STOCK', `estoque insuficiente para variante ${it.variantId}`);
        }
      }

      const created = await tx.order.create({
        data: {
          userId: session.user.id as string,
          status: 'pending',
          subtotal: prepared.subtotal,
          taxTotal: totals.taxTotal,
          total: totals.total,
          shippingTotal: totals.shippingTotal,
          discountTotal: totals.discountTotal,
          items: { create: prepared.orderItems },
        },
        include: { items: true },
      });

      await tx.payment.create({
        data: {
          provider: 'manual',
          providerReference: `order-${created.id}`,
          status: 'pending',
          amount: totals.total,
          orderId: created.id,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: created.id,
          userId: session.user.id,
          action: 'created',
          payload: {
            subtotal: prepared.subtotal,
            taxTotal: totals.taxTotal,
            total: totals.total,
            shippingTotal: totals.shippingTotal,
            discountTotal: totals.discountTotal,
            items: prepared.orderItems,
          },
        },
      });

      return created;
    });

    logger.info('checkout created order', { correlationId, orderId: order.id, userId: session.user.id, total: totals.total });
    return NextResponse.json({ ok: true, order }, { headers: limit.headers });
  } catch (err) {
    if (err instanceof CheckoutError) {
      logger.warn('checkout transaction rejected', { correlationId, code: err.code, message: err.message });
      return NextResponse.json({ error: err.message }, { status: 400, headers: limit.headers });
    }
    captureError(err, { correlationId, route: 'orders', userId: session?.user?.id });
    return NextResponse.json({ error: 'erro ao processar pedido' }, { status: 500, headers: limit.headers });
  }
}
