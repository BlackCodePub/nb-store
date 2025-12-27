import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { userHasPermission, userIsAdmin } from '../../../../src/server/auth/rbac';
import { prisma } from '../../../../src/server/db/client';

const TAX_RATE = Number(process.env.TAX_RATE ?? 0);

async function getSessionWithGuard() {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    redirect('/login?from=admin-orders');
  }
  const isAdmin = await userIsAdmin(session.user.id);
  const canWrite = isAdmin || (await userHasPermission(session.user.id, 'orders:write'));
  if (!canWrite) {
    redirect('/admin?denied=orders');
  }
  const canExport = isAdmin || (await userHasPermission(session.user.id, 'orders:export'));
  return { session, canExport };
}

export default async function OrdersPage() {
  const { canExport } = await getSessionWithGuard();

  async function updateStatus(formData: FormData) {
    'use server';
    const { session } = await getSessionWithGuard();
    const orderId = String(formData.get('orderId') || '');
    const status = String(formData.get('status') || '').trim();
    if (!orderId || !status || !session.user?.id) return;
    await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({ where: { id: orderId }, data: { status } });
      await tx.orderEvent.create({
        data: {
          orderId,
          userId: session.user.id,
          action: 'status_changed',
          payload: { status },
        },
      });
      return updated;
    });
    revalidatePath('/admin/orders');
  }
  
  async function fulfill(formData: FormData) {
    'use server';
    const { session } = await getSessionWithGuard();
    const orderId = String(formData.get('orderId') || '');
    const invoiceNumber = String(formData.get('invoiceNumber') || '').trim() || null;
    if (!orderId || !session.user?.id) return;
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'fulfilled',
          fulfilledAt: new Date(),
          invoiceNumber,
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId,
          userId: session.user.id,
          action: 'fulfilled',
          payload: { invoiceNumber },
        },
      });
    });
    revalidatePath('/admin/orders');
  }

  async function updateTotals(formData: FormData) {
    'use server';
    const { session } = await getSessionWithGuard();
    const orderId = String(formData.get('orderId') || '');
    const shippingTotal = Math.max(0, Number(formData.get('shippingTotal') || 0));
    const discountTotal = Math.max(0, Number(formData.get('discountTotal') || 0));
    if (!orderId || !session.user?.id) return;
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) return;
      const subtotal = order.items.reduce((acc, it) => acc + it.price * it.quantity, 0);
      const taxTotal = Math.max(0, (subtotal - discountTotal + shippingTotal) * TAX_RATE);
      const total = subtotal - discountTotal + shippingTotal + taxTotal;
      await tx.order.update({ where: { id: orderId }, data: { shippingTotal, discountTotal, subtotal, taxTotal, total } });
      await tx.orderEvent.create({
        data: {
          orderId,
          userId: session.user.id,
          action: 'totals_updated',
          payload: { shippingTotal, discountTotal, taxTotal, total },
        },
      });
    });
    revalidatePath('/admin/orders');
  }

  const orders = await prisma.order.findMany({
    include: {
      user: true,
      items: { include: { product: true, variant: true } },
      events: { include: { user: true }, orderBy: { createdAt: 'desc' }, take: 5 },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const statuses = ['pending', 'paid', 'fulfilled', 'cancelled'];

  return (
    <div className="d-flex flex-column gap-4">
      <div className="card shadow-sm">
        <div className="card-body">
          <h1 className="h4 mb-3">Pedidos</h1>
          <p className="text-muted">Atualize status, fulfillment e NF. Ações liberadas apenas a orders:write ou admin.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="fw-semibold">Lista de pedidos</div>
            {canExport ? (
              <a className="btn btn-sm btn-outline-secondary" href="/api/admin/orders/export" target="_blank" rel="noreferrer">
                Exportar CSV
              </a>
            ) : (
              <span className="text-muted small">Sem permissão para exportar</span>
            )}
          </div>
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>NFe</th>
                  <th>Itens</th>
                  <th>Total</th>
                  <th>Criado</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="text-truncate" style={{ maxWidth: 120 }}>{o.id}</td>
                    <td>{o.user?.email || '—'}</td>
                    <td><span className="badge bg-light text-dark text-uppercase">{o.status}</span></td>
                    <td className="small">{o.invoiceNumber || '—'}</td>
                    <td>
                      {o.items.map((it) => (
                        <div key={it.id} className="small text-muted">
                          {it.product.name} {it.variant ? `(${it.variant.name})` : ''} x{it.quantity}
                        </div>
                      ))}
                    </td>
                    <td>
                      R$ {o.total.toFixed(2)}
                      <div className="text-muted small">Subtotal: R$ {o.subtotal.toFixed(2)}</div>
                      <div className="text-muted small">Frete: R$ {o.shippingTotal.toFixed(2)} • Desc: R$ {o.discountTotal.toFixed(2)}</div>
                      <div className="text-muted small">Imp: R$ {o.taxTotal.toFixed(2)}</div>
                    </td>
                    <td className="text-muted small">{o.createdAt.toISOString().slice(0, 19).replace('T', ' ')}</td>
                    <td>
                      <form action={updateStatus} className="d-flex gap-2 align-items-center mb-2">
                        <input type="hidden" name="orderId" value={o.id} />
                        <select name="status" className="form-select form-select-sm" defaultValue={o.status}>
                          {statuses.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button className="btn btn-sm btn-outline-primary" type="submit">Salvar</button>
                      </form>
                      <form action={fulfill} className="d-flex gap-2 align-items-center">
                        <input type="hidden" name="orderId" value={o.id} />
                        <input
                          name="invoiceNumber"
                          className="form-control form-control-sm"
                          placeholder="NF-e / RPS"
                          defaultValue={o.invoiceNumber || ''}
                        />
                        <button className="btn btn-sm btn-success" type="submit">Fulfill + NF</button>
                      </form>
                      <form action={updateTotals} className="d-flex flex-column gap-2">
                        <input type="hidden" name="orderId" value={o.id} />
                        <div className="input-group input-group-sm">
                          <span className="input-group-text">Frete</span>
                          <input name="shippingTotal" type="number" step="0.01" min="0" className="form-control" defaultValue={o.shippingTotal} />
                          <span className="input-group-text">Desconto</span>
                          <input name="discountTotal" type="number" step="0.01" min="0" className="form-control" defaultValue={o.discountTotal} />
                        </div>
                        <button className="btn btn-sm btn-outline-secondary" type="submit">Recalcular</button>
                      </form>
                      <div className="mt-2 border-top pt-2">
                        <div className="fw-semibold small mb-1">Eventos</div>
                        <div className="d-flex flex-column gap-1">
                          {o.events.map((ev) => (
                            <div key={ev.id} className="small text-muted">
                              <span className="fw-semibold text-dark">{ev.action}</span> — {ev.createdAt.toISOString().slice(0,16).replace('T',' ')}
                              {ev.user?.email ? ` • ${ev.user.email}` : ''}
                            </div>
                          ))}
                          {o.events.length === 0 && <span className="text-muted small">Sem eventos</span>}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-muted">Nenhum pedido</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
