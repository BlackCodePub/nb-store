import Link from 'next/link';
import { prisma } from '../../../src/server/db/client';

// Formatar preço em BRL
function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

interface PageProps {
  searchParams: Promise<{ page?: string; category?: string; q?: string }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const { page, category, q } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || '1', 10));
  const perPage = 12;

  // Construir filtros
  const where: any = { active: true };
  
  if (category) {
    const cat = await prisma.category.findUnique({ where: { slug: category } });
    if (cat) where.categoryId = cat.id;
  }

  if (q) {
    where.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
    ];
  }

  // Buscar categorias para filtro
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        type: true,
        category: true,
        images: { orderBy: { position: 'asc' }, take: 1 },
        variants: { take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / perPage);

  // Construir query string para paginação
  const buildUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set('page', String(pageNum));
    if (category) params.set('category', category);
    if (q) params.set('q', q);
    return `/products?${params.toString()}`;
  };

  return (
    <div className="container py-5">
      <div className="row">
        {/* Sidebar Filtros */}
        <div className="col-lg-3 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="h6 mb-3">Filtrar por Categoria</h5>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <Link
                    href="/products"
                    className={`text-decoration-none ${!category ? 'fw-bold text-primary' : 'text-dark'}`}
                  >
                    Todas
                  </Link>
                </li>
                {categories.map((cat) => (
                  <li key={cat.id} className="mb-2">
                    <Link
                      href={`/products?category=${cat.slug}`}
                      className={`text-decoration-none ${category === cat.slug ? 'fw-bold text-primary' : 'text-dark'}`}
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Busca */}
          <div className="card border-0 shadow-sm mt-3">
            <div className="card-body">
              <h5 className="h6 mb-3">Buscar</h5>
              <form action="/products" method="get">
                {category && <input type="hidden" name="category" value={category} />}
                <div className="input-group">
                  <input
                    type="text"
                    name="q"
                    className="form-control"
                    placeholder="Nome do produto..."
                    defaultValue={q || ''}
                  />
                  <button className="btn btn-primary" type="submit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="M21 21l-4.35-4.35"/>
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Lista de Produtos */}
        <div className="col-lg-9">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h4 mb-1">Produtos</h1>
              <small className="text-muted">
                {totalCount} {totalCount === 1 ? 'produto encontrado' : 'produtos encontrados'}
              </small>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="alert alert-info">
              Nenhum produto encontrado{q ? ` para "${q}"` : ''}.
            </div>
          ) : (
            <>
              <div className="row g-4">
                {products.map((product) => {
                  const imageUrl = product.images[0]?.url || null;
                  const price = product.variants[0]?.price ?? product.price;

                  return (
                    <div key={product.id} className="col-6 col-md-4">
                      <Link
                        href={`/product/${product.slug}`}
                        className="card h-100 text-decoration-none border-0 shadow-sm"
                      >
                        <div
                          className="card-img-top bg-secondary d-flex align-items-center justify-content-center"
                          style={{ height: 180, overflow: 'hidden' }}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={product.name}
                              className="img-fluid"
                              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                            />
                          ) : (
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" opacity="0.5">
                              <rect x="3" y="3" width="18" height="18" rx="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <path d="M21 15l-5-5L5 21"/>
                            </svg>
                          )}
                        </div>
                        <div className="card-body">
                          {product.category && (
                            <small className="text-muted d-block mb-1">{product.category.name}</small>
                          )}
                          <h5 className="card-title h6 mb-2 text-dark">{product.name}</h5>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fw-bold text-primary">{formatPrice(price)}</span>
                            {product.type === 'digital' && (
                              <span className="badge bg-info text-dark">Digital</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <nav className="mt-5" aria-label="Paginação">
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <Link href={buildUrl(currentPage - 1)} className="page-link">
                        Anterior
                      </Link>
                    </li>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <li
                          key={pageNum}
                          className={`page-item ${pageNum === currentPage ? 'active' : ''}`}
                        >
                          <Link href={buildUrl(pageNum)} className="page-link">
                            {pageNum}
                          </Link>
                        </li>
                      );
                    })}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <Link href={buildUrl(currentPage + 1)} className="page-link">
                        Próximo
                      </Link>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
