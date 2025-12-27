import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../src/server/auth/options';
import { userHasPermission, userIsAdmin } from '../../../../../src/server/auth/rbac';
import { prisma } from '../../../../../src/server/db/client';
import Link from 'next/link';

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
  return { session, isAdmin };
}

interface OrderDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const { id } = await params;
  const { session, isAdmin } = await getSessionWithGuard();

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, slug: true } },
          variant: { select: { id: true, sku: true, name: true } },
        },
      },
      events: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      },
      address: true,
      payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      shipments: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!order) notFound();

  async function updateStatus(formData: FormData) {
    'use server';
    const { session } = await getSessionWithGuard();
    const status = String(formData.get('status') || '').trim();
    if (!status || !session.user?.id) return;
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data: { status } });
      await tx.orderEvent.create({
        data: { orderId: id, userId: session.user.id, action: 'status_changed', payload: { status } },
      });
    });
    revalidatePath(`/admin/orders/${id}`);
  }

  async function addNote(formData: FormData) {
    'use server';
    const { session } = await getSessionWithGuard();
    const note = String(formData.get('note') || '').trim();
    if (!note || !session.user?.id) return;
    await prisma.orderEvent.create({
      data: { orderId: id, userId: session.user.id, action: 'note_added', payload: { note } },
    });
    revalidatePath(`/admin/orders/${id}`);
  }

  async function updateTracking(formData: FormData) {
    'use server';
    const { session } = await getSessionWithGuard();
    const trackingCode = String(formData.get('trackingCode') || '').trim();
    const carrier = String(formData.get('carrier') || 'correios').trim();
    const serviceCode = String(formData.get('serviceCode') || 'PAC').trim();
    if (!trackingCode || !session.user?.id) return;
    await prisma.$transaction(async (tx) => {
      await tx.orderShipment.create({
        data: { orderId: id, carrier, serviceCode, trackingCode, shippedAt: new Date() },
      });
      await tx.order.update({ where: { id }, data: { status: 'shipped' } });
      await tx.orderEvent.create({
        data: { orderId: id, userId: session.user.id, action: 'tracking_added', payload: { trackingCode, carrier, serviceCode } },
      });
    });
    revalidatePath(`/admin/orders/${id}`);
  }

  async function fulfill(formData: FormData) {
    'use server';
    const { session } = await getSessionWithGuard();
    const invoiceNumber = String(formData.get('invoiceNumber') || '').trim() || null;
    if (!session.user?.id) return;
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: 'fulfilled', fulfilledAt: new Date(), invoiceNumber },
      });
      await tx.orderEvent.create({
        data: { orderId: id, userId: session.user.id, action: 'fulfilled', payload: { invoiceNumber } },
      });
    });
    revalidatePath(`/admin/orders/${id}`);
  }

  async function cancelOrder(formData: FormData) {
    'use server';
    const { session, isAdmin } = await getSessionWithGuard();
    if (!isAdmin || !session.user?.id) return;
    const reason = String(formData.get('reason') || '').trim() || null;
    await prisma.$transaction(async (tx) => {
      const orderItems = await tx.orderItem.findMany({ where: { orderId: id } });
      for (const item of orderItems) {
        if (item.variantId) {
          await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
        }
      }
      await tx.order.update({ where: { id }, data: { status: 'cancelled' } });
      await tx.orderEvent.create({
        data: { orderId: id, userId: session.user.id, action: 'cancelled', payload: { reason } },
      });
    });
    revalidatePath(`/admin/orders/${id}`);
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (date: Date | string) => new Date(date).toLocaleString('pt-BR');
  const statusLabels: Record<string, string> = {
    pending: 'Pendente', paid: 'Pago', processing: 'Processando',
    shipped: 'Enviado', fulfilled: 'Entregue', cancelled: 'Cancelado', refunded: 'Reembolsado',
  };
  const getStatusBadge = (status: string) => ({
    pending: 'bg-warning text-dark', paid: 'bg-success', processing: 'bg-info',
    shipped: 'bg-primary', fulfilled: 'bg-success', cancelled: 'bg-danger', refunded: 'bg-secondary',
  }[status] || 'bg-secondary');

  const orderNumber = order.invoiceNumber || id.substring(0, 8).toUpperCase();
  const shipment = order.shipments[0];
  const payment = order.payments[0];
  const paymentMethod = (payment?.payloadJson as { method?: string } | null)?.method || 'N/A';

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <Link href="/admin/orders" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-arrow-left"></i>
          </Link>
          <h1 className="h3 mb-0">Pedido #{orderNumber}</h1>
          <span className={`badge ${getStatusBadge(order.status)}`}>{statusLabels[order.status] || order.status}</span>
        </div>
        <div className="text-muted">{formatDate(order.createdAt)}</div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          {/* Itens */}
          <div className="card mb-4">
            <div className="card-header"><h5 className="card-title mb-0"><i className="bi bi-box me-2"></i>Itens do Pedido</h5></div>
            <div className="table-responsive">
              <table className="table mb-0">
                <thead className="table-light">
                  <tr><th>Produto</th><th className="text-center">Qtd</th><th className="text-end">Preço</th><th className="text-end">Total</th></tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.product?.name || 'Produto removido'}</strong>
                        {item.variant && <div className="small text-muted">Variante: {item.variant.name || item.variant.sku}</div>}
                      </td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-end">{formatCurrency(item.price)}</td>
                      <td className="text-end">{formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="table-light">
                  <tr><td colSpan={3} className="text-end">Subtotal:</td><td className="text-end">{formatCurrency(order.subtotal)}</td></tr>
                  {order.discountTotal > 0 && (
                    <tr className="text-success">
                      <td colSpan={3} className="text-end">Desconto{order.couponCode && ` (${order.couponCode})`}:</td>
                      <td className="text-end">-{formatCurrency(order.discountTotal)}</td>
                    </tr>
                  )}
                  {order.shippingTotal > 0 && (
                    <tr><td colSpan={3} className="text-end">Frete:</td><td className="text-end">{formatCurrency(order.shippingTotal)}</td></tr>
                  )}
                  {order.taxTotal > 0 && (
                    <tr><td colSpan={3} className="text-end">Impostos:</td><td className="text-end">{formatCurrency(order.taxTotal)}</td></tr>
                  )}
                  <tr className="fw-bold"><td colSpan={3} className="text-end">Total:</td><td className="text-end">{formatCurrency(order.total)}</td></tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Histórico */}
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0"><i className="bi bi-clock-history me-2"></i>Histórico</h5></div>
            <div className="card-body">
              {order.events.length === 0 ? (
                <p className="text-muted mb-0">Nenhum evento registrado.</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {order.events.map((event, idx) => (
                    <li key={event.id} className={`d-flex gap-3 ${idx < order.events.length - 1 ? 'pb-3 mb-3 border-bottom' : ''}`}>
                      <div className="flex-shrink-0">
                        {event.action === 'status_changed' && <i className="bi bi-arrow-repeat text-primary fs-5"></i>}
                        {event.action === 'note_added' && <i className="bi bi-chat-left-text text-info fs-5"></i>}
                        {event.action === 'tracking_added' && <i className="bi bi-truck text-success fs-5"></i>}
                        {event.action === 'fulfilled' && <i className="bi bi-check-circle text-success fs-5"></i>}
                        {event.action === 'cancelled' && <i className="bi bi-x-circle text-danger fs-5"></i>}
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            {event.action === 'status_changed' && <strong>Status: {statusLabels[(event.payload as { status: string })?.status] || (event.payload as { status: string })?.status}</strong>}
                            {event.action === 'note_added' && <><strong>Nota:</strong> {(event.payload as { note: string })?.note}</>}
                            {event.action === 'tracking_added' && <strong>Rastreio: {(event.payload as { trackingCode: string })?.trackingCode}</strong>}
                            {event.action === 'fulfilled' && <strong>Pedido entregue</strong>}
                            {event.action === 'cancelled' && <strong className="text-danger">Cancelado{(event.payload as { reason?: string })?.reason && `: ${(event.payload as { reason?: string })?.reason}`}</strong>}
                          </div>
                          <small className="text-muted">{formatDate(event.createdAt)}</small>
                        </div>
                        <small className="text-muted">por {event.user?.name || event.user?.email || 'Sistema'}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <form action={addNote} className="mt-3 pt-3 border-top">
                <div className="input-group">
                  <input type="text" name="note" className="form-control" placeholder="Adicionar nota..." required />
                  <button type="submit" className="btn btn-outline-primary"><i className="bi bi-plus-lg"></i></button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          {/* Ações */}
          <div className="card mb-4">
            <div className="card-header"><h5 className="card-title mb-0"><i className="bi bi-gear me-2"></i>Ações</h5></div>
            <div className="card-body">
              <form action={updateStatus} className="mb-3">
                <label className="form-label small">Alterar Status</label>
                <div className="input-group">
                  <select name="status" className="form-select" defaultValue={order.status}>
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                    <option value="processing">Processando</option>
                    <option value="shipped">Enviado</option>
                    <option value="fulfilled">Entregue</option>
                    <option value="refunded">Reembolsado</option>
                  </select>
                  <button type="submit" className="btn btn-primary"><i className="bi bi-check"></i></button>
                </div>
              </form>

              {!shipment && order.status !== 'cancelled' && (
                <form action={updateTracking} className="mb-3">
                  <label className="form-label small">Rastreio</label>
                  <input type="text" name="trackingCode" className="form-control mb-2" placeholder="Código de rastreio" required />
                  <div className="row g-2 mb-2">
                    <div className="col">
                      <input type="text" name="carrier" className="form-control" placeholder="Transportadora" defaultValue="correios" />
                    </div>
                    <div className="col">
                      <input type="text" name="serviceCode" className="form-control" placeholder="Serviço" defaultValue="PAC" />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-outline-primary w-100"><i className="bi bi-truck me-2"></i>Adicionar</button>
                </form>
              )}

              {shipment && (
                <div className="alert alert-info small mb-3">
                  <strong><i className="bi bi-truck me-2"></i>Rastreio:</strong> {shipment.trackingCode}
                  <span className="ms-2 text-muted">({shipment.carrier} - {shipment.serviceCode})</span>
                </div>
              )}

              {order.status !== 'fulfilled' && order.status !== 'cancelled' && (
                <form action={fulfill} className="mb-3">
                  <input type="text" name="invoiceNumber" className="form-control mb-2" placeholder="Número NF (opcional)" />
                  <button type="submit" className="btn btn-success w-100"><i className="bi bi-check-circle me-2"></i>Marcar Entregue</button>
                </form>
              )}

              {isAdmin && order.status !== 'cancelled' && order.status !== 'fulfilled' && (
                <form action={cancelOrder}>
                  <input type="text" name="reason" className="form-control mb-2" placeholder="Motivo cancelamento" />
                  <button type="submit" className="btn btn-outline-danger w-100"><i className="bi bi-x-circle me-2"></i>Cancelar</button>
                </form>
              )}
            </div>
          </div>

          {/* Cliente */}
          <div className="card mb-4">
            <div className="card-header"><h5 className="card-title mb-0"><i className="bi bi-person me-2"></i>Cliente</h5></div>
            <div className="card-body">
              {order.user ? (
                <><p className="mb-1"><strong>{order.user.name || 'Sem nome'}</strong></p><p className="mb-0 text-muted">{order.user.email}</p></>
              ) : (
                <p className="text-muted mb-0">Cliente não identificado</p>
              )}
            </div>
          </div>

          {/* Endereço */}
          {order.address && (
            <div className="card mb-4">
              <div className="card-header"><h5 className="card-title mb-0"><i className="bi bi-geo-alt me-2"></i>Endereço</h5></div>
              <div className="card-body">
                <p className="mb-1"><strong>{order.address.name}</strong></p>
                <p className="mb-1 small">{order.address.street}, {order.address.number}{order.address.complement && ` - ${order.address.complement}`}</p>
                <p className="mb-1 small">{order.address.neighborhood}</p>
                <p className="mb-1 small">{order.address.city} - {order.address.state}</p>
                <p className="mb-0 small">CEP: {order.address.zipCode}</p>
                {order.address.phone && <p className="mb-0 small mt-2"><i className="bi bi-telephone me-1"></i>{order.address.phone}</p>}
              </div>
            </div>
          )}

          {/* Pagamento */}
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0"><i className="bi bi-credit-card me-2"></i>Pagamento</h5></div>
            <div className="card-body">
              <p className="mb-1"><strong>Método:</strong> {paymentMethod}</p>
              {payment && (
                <>
                  <p className="mb-1 small"><strong>Status:</strong> <span className={`badge ${payment.status === 'paid' ? 'bg-success' : 'bg-warning text-dark'}`}>{payment.status}</span></p>
                  <p className="mb-0 small text-muted">ID: {payment.providerReference}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
