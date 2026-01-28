import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '../../../../src/server/db/client';
import { getServerLocale } from '../../../../src/i18n/server';

// Formatar preço em BRL
function formatPrice(price: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

function getTranslatedName<T extends { name: string; nameEn?: string | null }>(item: T, locale: string) {
  return locale === 'en-US' ? (item.nameEn || item.name) : item.name;
}

function getTranslatedDescription<T extends { description?: string | null; descriptionEn?: string | null }>(item: T, locale: string) {
  const fallback = item.description || '';
  return locale === 'en-US' ? (item.descriptionEn || fallback) : fallback;
}

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const locale = await getServerLocale();
  const { slug } = await params;
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || '1', 10));
  const perPage = 12;

  const category = await prisma.category.findUnique({
    where: { slug },
  });

  if (!category) {
    notFound();
  }

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where: { categoryId: category.id, active: true },
      select: {
        id: true,
        name: true,
        nameEn: true,
        slug: true,
        price: true,
        type: true,
        images: { orderBy: { position: 'asc' }, take: 1 },
        variants: { take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({
      where: { categoryId: category.id, active: true },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / perPage);

  return (
    <div className="container py-5">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/">Home</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {category.name}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-4">
        <h1 className="h3">{getTranslatedName(category, locale)}</h1>
        {getTranslatedDescription(category, locale) && (
          <p className="text-muted">{getTranslatedDescription(category, locale)}</p>
        )}
        <small className="text-muted">
          {totalCount} {totalCount === 1 ? 'produto encontrado' : 'produtos encontrados'}
        </small>
      </div>

      {/* Produtos */}
      {products.length === 0 ? (
        <div className="alert alert-info">
          Nenhum produto nesta categoria ainda.
        </div>
      ) : (
        <>
          <div className="row g-4">
            {products.map((product) => {
              const imageUrl = product.images[0]?.url || null;
              const price = product.variants[0]?.price ?? product.price;

              return (
                <div key={product.id} className="col-6 col-md-4 col-lg-3">
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
                      <h5 className="card-title h6 mb-2 text-dark">{getTranslatedName(product, locale)}</h5>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold text-primary">{formatPrice(price, locale)}</span>
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
                  <Link
                    href={`/category/${slug}?page=${currentPage - 1}`}
                    className="page-link"
                  >
                    Anterior
                  </Link>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <li
                    key={pageNum}
                    className={`page-item ${pageNum === currentPage ? 'active' : ''}`}
                  >
                    <Link
                      href={`/category/${slug}?page=${pageNum}`}
                      className="page-link"
                    >
                      {pageNum}
                    </Link>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <Link
                    href={`/category/${slug}?page=${currentPage + 1}`}
                    className="page-link"
                  >
                    Próximo
                  </Link>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
