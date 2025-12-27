import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../src/server/auth/options';
import { prisma } from '../../../src/server/db/client';
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

export default async function AccountPage() {
  const session = await getServerSession(buildAuthOptions('store'));

  if (!session?.user?.id) {
    redirect('/login?from=account');
  }

  // Buscar dados do dashboard
  const [user, recentOrders, orderStats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    }),
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        items: {
          take: 1,
          select: {
            product: {
              select: {
                name: true,
                images: { take: 1, select: { url: true } },
              },
            },
          },
        },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.aggregate({
      where: { userId: session.user.id },
      _count: true,
      _sum: { total: true },
    }),
  ]);

  const totalOrders = orderStats._count || 0;
  const totalSpent = orderStats._sum.total || 0;

  return (
    <div className="row g-4">
      {/* Cards de Estatísticas */}
      <div className="col-md-6 col-xl-4">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <div
                className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center me-3"
                style={{ width: 48, height: 48 }}
              >
                <i className="bi bi-bag fs-5"></i>
              </div>
              <div>
                <p className="text-muted small mb-0">Total de Pedidos</p>
                <h4 className="mb-0">{totalOrders}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-md-6 col-xl-4">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <div
                className="rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center me-3"
                style={{ width: 48, height: 48 }}
              >
                <i className="bi bi-currency-dollar fs-5"></i>
              </div>
              <div>
                <p className="text-muted small mb-0">Total Gasto</p>
                <h4 className="mb-0">{formatPrice(totalSpent)}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-md-6 col-xl-4">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <div
                className="rounded-circle bg-info bg-opacity-10 text-info d-flex align-items-center justify-content-center me-3"
                style={{ width: 48, height: 48 }}
              >
                <i className="bi bi-calendar3 fs-5"></i>
              </div>
              <div>
                <p className="text-muted small mb-0">Cliente desde</p>
                <h6 className="mb-0">{user ? formatDate(user.createdAt) : '-'}</h6>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pedidos Recentes */}
      <div className="col-12">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
            <h5 className="mb-0">Pedidos Recentes</h5>
            <Link href="/account/orders" className="btn btn-sm btn-outline-primary">
              Ver todos
            </Link>
          </div>
          <div className="card-body p-0">
            {recentOrders.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-bag-x fs-1 text-muted"></i>
                <p className="text-muted mt-3 mb-0">Você ainda não fez nenhum pedido.</p>
                <Link href="/products" className="btn btn-primary mt-3">
                  Explorar produtos
                </Link>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Pedido</th>
                      <th>Data</th>
                      <th>Status</th>
                      <th>Itens</th>
                      <th className="text-end pe-4">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => {
                      const status = getStatusLabel(order.status);
                      const firstProduct = order.items[0]?.product;
                      return (
                        <tr key={order.id}>
                          <td className="ps-4">
                            <Link
                              href={`/account/orders/${order.id}`}
                              className="text-decoration-none fw-medium"
                            >
                              #{order.id.slice(-8).toUpperCase()}
                            </Link>
                          </td>
                          <td className="text-muted">{formatDate(order.createdAt)}</td>
                          <td>
                            <span className={`badge bg-${status.color}`}>{status.label}</span>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              {firstProduct?.images[0]?.url && (
                                <img
                                  src={firstProduct.images[0].url}
                                  alt=""
                                  width={32}
                                  height={32}
                                  className="rounded object-fit-cover"
                                />
                              )}
                              <span className="text-muted small">
                                {order._count.items} {order._count.items === 1 ? 'item' : 'itens'}
                              </span>
                            </div>
                          </td>
                          <td className="text-end pe-4 fw-medium">{formatPrice(order.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="col-12">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0">Ações Rápidas</h5>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <Link
                  href="/account/profile"
                  className="d-flex align-items-center gap-3 p-3 rounded border text-decoration-none text-dark hover-bg-light"
                >
                  <div
                    className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center"
                    style={{ width: 40, height: 40 }}
                  >
                    <i className="bi bi-person"></i>
                  </div>
                  <div>
                    <h6 className="mb-0">Editar Perfil</h6>
                    <small className="text-muted">Atualize seus dados</small>
                  </div>
                </Link>
              </div>
              <div className="col-md-4">
                <Link
                  href="/account/addresses"
                  className="d-flex align-items-center gap-3 p-3 rounded border text-decoration-none text-dark hover-bg-light"
                >
                  <div
                    className="rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center"
                    style={{ width: 40, height: 40 }}
                  >
                    <i className="bi bi-geo-alt"></i>
                  </div>
                  <div>
                    <h6 className="mb-0">Endereços</h6>
                    <small className="text-muted">Gerencie seus endereços</small>
                  </div>
                </Link>
              </div>
              <div className="col-md-4">
                <Link
                  href="/account/security"
                  className="d-flex align-items-center gap-3 p-3 rounded border text-decoration-none text-dark hover-bg-light"
                >
                  <div
                    className="rounded-circle bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center"
                    style={{ width: 40, height: 40 }}
                  >
                    <i className="bi bi-shield-lock"></i>
                  </div>
                  <div>
                    <h6 className="mb-0">Segurança</h6>
                    <small className="text-muted">Altere sua senha</small>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
