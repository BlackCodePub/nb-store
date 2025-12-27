import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { prisma } from '../../../../src/server/db/client';
import Link from 'next/link';
import { redirect } from 'next/navigation';

// Formatar preço em BRL
function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

// Formatar data
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

// Status do pedido em português
function getStatusLabel(status: string): { label: string; color: string } {
  const statuses: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pendente', color: 'warning' },
    processing: { label: 'Processando', color: 'info' },
    paid: { label: 'Pago', color: 'success' },
    shipped: { label: 'Enviado', color: 'primary' },
    delivered: { label: 'Entregue', color: 'success' },
    cancelled: { label: 'Cancelado', color: 'danger' },
    refunded: { label: 'Reembolsado', color: 'secondary' },
  };
  return statuses[status] || { label: status, color: 'secondary' };
}

export default async function OrdersPage() {
  const session = await getServerSession(buildAuthOptions('store'));

  if (!session?.user?.id) {
    redirect('/login?from=account/orders');
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          product: {
            select: {
              name: true,
              slug: true,
              images: { take: 1, select: { url: true } },
            },
          },
          variant: { select: { name: true } },
        },
      },
      address: true,
      shipments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white py-3">
        <h5 className="mb-0">Meus Pedidos</h5>
        <small className="text-muted">Acompanhe seus pedidos e histórico de compras</small>
      </div>
      <div className="card-body p-0">
        {orders.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-bag-x display-1 text-muted"></i>
            <h5 className="mt-4">Nenhum pedido encontrado</h5>
            <p className="text-muted">Você ainda não realizou nenhuma compra.</p>
            <Link href="/products" className="btn btn-primary">
              <i className="bi bi-shop me-2"></i>
              Explorar produtos
            </Link>
          </div>
        ) : (
          <div className="accordion accordion-flush" id="ordersAccordion">
            {orders.map((order, index) => {
              const status = getStatusLabel(order.status);
              const trackingCode = order.shipments[0]?.trackingCode;

              return (
                <div className="accordion-item" key={order.id}>
                  <h2 className="accordion-header">
                    <button
                      className={`accordion-button ${index !== 0 ? 'collapsed' : ''}`}
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target={`#order-${order.id}`}
                      aria-expanded={index === 0}
                    >
                      <div className="d-flex flex-wrap align-items-center gap-3 w-100 pe-3">
                        <div>
                          <span className="fw-bold">#{order.id.slice(-8).toUpperCase()}</span>
                        </div>
                        <span className={`badge bg-${status.color}`}>{status.label}</span>
                        <span className="text-muted small">{formatDate(order.createdAt)}</span>
                        <span className="ms-auto fw-bold">{formatPrice(order.total)}</span>
                      </div>
                    </button>
                  </h2>
                  <div
                    id={`order-${order.id}`}
                    className={`accordion-collapse collapse ${index === 0 ? 'show' : ''}`}
                    data-bs-parent="#ordersAccordion"
                  >
                    <div className="accordion-body">
                      {/* Itens do Pedido */}
                      <h6 className="mb-3">
                        <i className="bi bi-box-seam me-2"></i>
                        Itens do Pedido
                      </h6>
                      <div className="row g-3 mb-4">
                        {order.items.map((item) => (
                          <div className="col-12" key={item.id}>
                            <div className="d-flex align-items-center gap-3 p-2 rounded bg-light">
                              {item.product.images[0]?.url ? (
                                <img
                                  src={item.product.images[0].url}
                                  alt={item.product.name}
                                  width={60}
                                  height={60}
                                  className="rounded object-fit-cover"
                                />
                              ) : (
                                <div
                                  className="bg-secondary rounded d-flex align-items-center justify-content-center"
                                  style={{ width: 60, height: 60 }}
                                >
                                  <i className="bi bi-image text-white"></i>
                                </div>
                              )}
                              <div className="flex-fill">
                                <Link
                                  href={`/product/${item.product.slug}`}
                                  className="text-decoration-none text-dark fw-medium"
                                >
                                  {item.product.name}
                                </Link>
                                {item.variant && item.variant.name !== 'Default' && (
                                  <div className="small text-muted">{item.variant.name}</div>
                                )}
                                <div className="small text-muted">Qtd: {item.quantity}</div>
                              </div>
                              <div className="text-end">
                                <div className="fw-medium">{formatPrice(item.price * item.quantity)}</div>
                                <div className="small text-muted">{formatPrice(item.price)} cada</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Resumo de Valores */}
                      <div className="row g-4">
                        <div className="col-md-6">
                          {/* Endereço de Entrega */}
                          {order.address && (
                            <>
                              <h6 className="mb-2">
                                <i className="bi bi-geo-alt me-2"></i>
                                Endereço de Entrega
                              </h6>
                              <p className="small text-muted mb-0">
                                {order.address.name}
                                <br />
                                {order.address.street}, {order.address.number}
                                {order.address.complement && ` - ${order.address.complement}`}
                                <br />
                                {order.address.neighborhood} - {order.address.city}/{order.address.state}
                                <br />
                                CEP: {order.address.zipCode}
                              </p>
                            </>
                          )}

                          {/* Código de Rastreio */}
                          {trackingCode && (
                            <div className="mt-3">
                              <h6 className="mb-2">
                                <i className="bi bi-truck me-2"></i>
                                Rastreamento
                              </h6>
                              <p className="mb-0">
                                <span className="badge bg-primary">{trackingCode}</span>
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="col-md-6">
                          <h6 className="mb-2">
                            <i className="bi bi-receipt me-2"></i>
                            Resumo
                          </h6>
                          <table className="table table-sm table-borderless mb-0">
                            <tbody>
                              <tr>
                                <td className="text-muted ps-0">Subtotal</td>
                                <td className="text-end pe-0">{formatPrice(order.subtotal)}</td>
                              </tr>
                              <tr>
                                <td className="text-muted ps-0">Frete</td>
                                <td className="text-end pe-0">{formatPrice(order.shippingTotal)}</td>
                              </tr>
                              {order.discountTotal > 0 && (
                                <tr>
                                  <td className="text-muted ps-0">Desconto</td>
                                  <td className="text-end pe-0 text-success">
                                    -{formatPrice(order.discountTotal)}
                                  </td>
                                </tr>
                              )}
                              <tr className="border-top">
                                <td className="fw-bold ps-0">Total</td>
                                <td className="text-end fw-bold pe-0">{formatPrice(order.total)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="d-flex gap-2 mt-4 pt-3 border-top">
                        <Link
                          href={`/account/orders/${order.id}`}
                          className="btn btn-sm btn-outline-primary"
                        >
                          <i className="bi bi-eye me-1"></i>
                          Ver detalhes
                        </Link>
                        {order.status === 'delivered' && (
                          <button className="btn btn-sm btn-outline-secondary">
                            <i className="bi bi-arrow-repeat me-1"></i>
                            Comprar novamente
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
