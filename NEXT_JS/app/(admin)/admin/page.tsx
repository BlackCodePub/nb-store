import { prisma } from '../../../src/server/db/client';
import Link from 'next/link';

async function getStats() {
  const [
    ordersToday,
    ordersPending,
    totalRevenue,
    totalProducts,
    totalUsers,
    lowStockVariants,
    recentOrders,
  ] = await Promise.all([
    // Pedidos hoje
    prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    // Pedidos pendentes
    prisma.order.count({
      where: { status: 'pending' },
    }),
    // Receita total (apenas pedidos pagos/fulfilled)
    prisma.order.aggregate({
      where: { status: { in: ['paid', 'processing', 'shipped', 'fulfilled'] } },
      _sum: { total: true },
    }),
    // Total de produtos
    prisma.product.count({ where: { active: true } }),
    // Total de usuários
    prisma.user.count(),
    // Variantes com estoque baixo (stock está em ProductVariant, não Product)
    prisma.productVariant.findMany({
      where: {
        stock: { lte: 5 },
        product: { active: true },
      },
      select: { id: true, name: true, sku: true, stock: true, product: { select: { name: true, slug: true } } },
      take: 5,
    }),
    // Pedidos recentes
    prisma.order.findMany({
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return {
    ordersToday,
    ordersPending,
    totalRevenue: Number(totalRevenue._sum.total || 0),
    totalProducts,
    totalUsers,
    lowStockVariants,
    recentOrders,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-warning text-dark',
      paid: 'bg-success',
      processing: 'bg-info',
      shipped: 'bg-primary',
      fulfilled: 'bg-success',
      cancelled: 'bg-danger',
      refunded: 'bg-secondary',
    };
    return badges[status] || 'bg-secondary';
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    paid: 'Pago',
    processing: 'Processando',
    shipped: 'Enviado',
    fulfilled: 'Entregue',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
  };

  return (
    <div>
      <h1 className="h3 mb-4">
        <i className="bi bi-speedometer2 me-2"></i>
        Dashboard
      </h1>

      {/* KPIs */}
      <div className="row g-4 mb-4">
        <div className="col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-muted mb-1 small">Pedidos Hoje</p>
                  <h3 className="mb-0">{stats.ordersToday}</h3>
                </div>
                <div className="bg-primary bg-opacity-10 rounded-3 p-3">
                  <i className="bi bi-cart text-primary fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-muted mb-1 small">Pedidos Pendentes</p>
                  <h3 className="mb-0">{stats.ordersPending}</h3>
                </div>
                <div className="bg-warning bg-opacity-10 rounded-3 p-3">
                  <i className="bi bi-hourglass-split text-warning fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-muted mb-1 small">Receita Total</p>
                  <h3 className="mb-0">{formatCurrency(stats.totalRevenue)}</h3>
                </div>
                <div className="bg-success bg-opacity-10 rounded-3 p-3">
                  <i className="bi bi-currency-dollar text-success fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-muted mb-1 small">Usuários</p>
                  <h3 className="mb-0">{stats.totalUsers}</h3>
                </div>
                <div className="bg-info bg-opacity-10 rounded-3 p-3">
                  <i className="bi bi-people text-info fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Pedidos Recentes */}
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Pedidos Recentes
              </h5>
              <Link href="/admin/orders" className="btn btn-sm btn-outline-primary">
                Ver todos
              </Link>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Status</th>
                    <th className="text-end">Total</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        Nenhum pedido encontrado
                      </td>
                    </tr>
                  ) : (
                    stats.recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <Link href={`/admin/orders/${order.id}`} className="fw-semibold text-decoration-none">
                            #{order.id.substring(0, 8)}
                          </Link>
                        </td>
                        <td>
                          {order.user?.name || order.user?.email || '-'}
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadge(order.status)}`}>
                            {statusLabels[order.status] || order.status}
                          </span>
                        </td>
                        <td className="text-end">{formatCurrency(Number(order.total))}</td>
                        <td className="small text-muted">{formatDate(order.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="col-lg-4">
          {/* Estoque Baixo */}
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="bi bi-exclamation-triangle text-warning me-2"></i>
                Estoque Baixo
              </h5>
            </div>
            <div className="card-body">
              {stats.lowStockVariants.length === 0 ? (
                <p className="text-muted mb-0 small">Nenhum produto com estoque baixo</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {stats.lowStockVariants.map((variant) => (
                    <li key={variant.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                      <Link href={`/admin/catalog`} className="text-decoration-none">
                        {variant.product.name} - {variant.name}
                      </Link>
                      <span className={`badge ${variant.stock === 0 ? 'bg-danger' : 'bg-warning text-dark'}`}>
                        {variant.stock}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Atalhos Rápidos */}
          <div className="card shadow-sm">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="bi bi-lightning me-2"></i>
                Ações Rápidas
              </h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link href="/admin/catalog" className="btn btn-outline-primary text-start">
                  <i className="bi bi-plus-circle me-2"></i>
                  Novo Produto
                </Link>
                <Link href="/admin/orders" className="btn btn-outline-primary text-start">
                  <i className="bi bi-box-seam me-2"></i>
                  Gerenciar Pedidos
                </Link>
                <Link href="/admin/coupons" className="btn btn-outline-primary text-start">
                  <i className="bi bi-tag me-2"></i>
                  Criar Cupom
                </Link>
                <Link href="/admin/settings" className="btn btn-outline-primary text-start">
                  <i className="bi bi-gear me-2"></i>
                  Configurações
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
