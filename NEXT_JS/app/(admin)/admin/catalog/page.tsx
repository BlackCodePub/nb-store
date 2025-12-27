import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { userHasPermission, userIsAdmin } from '../../../../src/server/auth/rbac';
import { prisma } from '../../../../src/server/db/client';
import Link from 'next/link';

async function getSessionWithGuard() {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    redirect('/login?from=admin-catalog');
  }
  const isAdmin = await userIsAdmin(session.user.id);
  const canWrite = isAdmin || (await userHasPermission(session.user.id, 'catalog:write'));
  const canImages = isAdmin || canWrite || (await userHasPermission(session.user.id, 'catalog:images'));
  if (!canWrite && !canImages) {
    redirect('/admin?denied=catalog');
  }
  return { session, canWrite, canImages };
}

export default async function CatalogPage() {
  await getSessionWithGuard();

  // Estatísticas
  const [categoryCount, productCount, activeProductCount, lowStockCount] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.product.count({ where: { active: true } }),
    prisma.productVariant.count({ where: { stock: { lte: 5 } } }),
  ]);

  const stats = [
    {
      label: 'Categorias',
      value: categoryCount,
      icon: 'bi-tags',
      color: 'primary',
      link: '/admin/catalog/categories',
    },
    {
      label: 'Produtos',
      value: productCount,
      icon: 'bi-box-seam',
      color: 'success',
      link: '/admin/catalog/products',
    },
    {
      label: 'Ativos',
      value: activeProductCount,
      icon: 'bi-check-circle',
      color: 'info',
      link: '/admin/catalog/products?status=active',
    },
    {
      label: 'Estoque Baixo',
      value: lowStockCount,
      icon: 'bi-exclamation-triangle',
      color: 'warning',
      link: '/admin/catalog/products?stock=low',
    },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">
          <i className="bi bi-grid me-2"></i>
          Catálogo
        </h1>
      </div>

      {/* Cards de Estatísticas */}
      <div className="row g-4 mb-4">
        {stats.map((stat) => (
          <div key={stat.label} className="col-6 col-lg-3">
            <Link href={stat.link} className="text-decoration-none">
              <div className="card shadow-sm h-100 border-0">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <p className="text-muted mb-1 small">{stat.label}</p>
                      <h3 className="mb-0">{stat.value}</h3>
                    </div>
                    <div className={`bg-${stat.color} bg-opacity-10 p-3 rounded`}>
                      <i className={`bi ${stat.icon} fs-4 text-${stat.color}`}></i>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Links Rápidos */}
      <div className="row g-4">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-tags me-2 text-primary"></i>
                Categorias
              </h5>
              <p className="card-text text-muted">
                Gerencie as categorias de produtos da loja. Organize seu catálogo de forma eficiente.
              </p>
              <Link href="/admin/catalog/categories" className="btn btn-primary">
                <i className="bi bi-arrow-right me-2"></i>
                Gerenciar Categorias
              </Link>
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-box-seam me-2 text-success"></i>
                Produtos
              </h5>
              <p className="card-text text-muted">
                Cadastre e edite produtos, variantes, preços e estoque. Gerencie imagens dos produtos.
              </p>
              <Link href="/admin/catalog/products" className="btn btn-success">
                <i className="bi bi-arrow-right me-2"></i>
                Gerenciar Produtos
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {lowStockCount > 0 && (
        <div className="alert alert-warning mt-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          <strong>{lowStockCount}</strong> variante(s) com estoque baixo (≤ 5 unidades).
          <Link href="/admin/catalog/products?stock=low" className="alert-link ms-2">
            Ver produtos
          </Link>
        </div>
      )}
    </div>
  );
}
