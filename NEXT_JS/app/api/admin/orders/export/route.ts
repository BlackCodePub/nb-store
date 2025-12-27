import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../src/server/auth/options';
import { userIsAdmin, userHasPermission } from '../../../../../src/server/auth/rbac';
import { prisma } from '../../../../../src/server/db/client';
import { logger, captureError } from '../../../../../src/server/utils/logger';

export async function GET() {
  const correlationId = 'export-' + Date.now();
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const allowed = (await userIsAdmin(session.user.id)) || (await userHasPermission(session.user.id, 'orders:export'));
  if (!allowed) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const orders = await prisma.order.findMany({
      include: {
        user: true,
        items: { include: { product: true, variant: true } },
        events: { include: { user: true }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

  const header = [
    'id','userEmail','status','subtotal','shipping','discount','tax','total','createdAt','paidAt','fulfilledAt','invoiceNumber','items','eventsAudit'
  ];
  const rows = orders.map((o) => {
    const items = o.items
      .map((it) => `${it.product.name}${it.variant ? ` (${it.variant.name})` : ''} x${it.quantity} @${it.price}`)
      .join(' | ');
    const events = o.events
      .map((ev) => `${ev.action} @ ${ev.createdAt.toISOString()}${ev.user?.email ? ` by ${ev.user.email}` : ''}`)
      .join(' | ');
    return [
      o.id,
      o.user?.email ?? '',
      o.status,
      o.subtotal,
      o.shippingTotal,
      o.discountTotal,
      o.taxTotal,
      o.total,
      o.createdAt.toISOString(),
      o.paidAt?.toISOString() ?? '',
      o.fulfilledAt?.toISOString() ?? '',
      o.invoiceNumber ?? '',
      items,
      events,
    ];
  });

    const csv = [header.join(','), ...rows.map((r) => r.map((v) => typeof v === 'string' && v.includes(',') ? `"${v}"` : v).join(','))].join('\n');

    logger.info('orders export generated', { correlationId, userId: session.user.id, count: orders.length });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="orders.csv"',
      },
    });
  } catch (err) {
    captureError(err, { correlationId, userId: session.user.id, route: 'admin/export' });
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
