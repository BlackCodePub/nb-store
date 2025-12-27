import Link from 'next/link';
import { prisma } from '../src/server/db/client';
import type { Decimal } from '@prisma/client/runtime/library';

// Type assertion para garantir acesso a todos os models
const db = prisma as any;

// Converter Decimal/number para número
function toNumber(value: Decimal | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

// Formatar preço em BRL
function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

// Formatar data para exibição
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default async function HomePage() {
  const now = new Date();

  // Buscar banners ativos
  const banners = await db.banner.findMany({
    where: {
      active: true,
      OR: [
        { startsAt: null, endsAt: null },
        { startsAt: { lte: now }, endsAt: null },
        { startsAt: null, endsAt: { gte: now } },
        { startsAt: { lte: now }, endsAt: { gte: now } },
      ],
    },
    orderBy: { position: 'asc' },
  });

  // Buscar categorias com contagem de produtos
  const categories = await db.category.findMany({
    include: {
      _count: { select: { products: true } },
    },
    orderBy: { name: 'asc' },
  });

  // Buscar produtos ativos em destaque (últimos 8)
  const featuredProducts = await db.product.findMany({
    where: { active: true },
    include: {
      category: true,
      images: { orderBy: { position: 'asc' }, take: 1 },
      variants: { take: 1 },
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });

  // Buscar últimos posts do blog
  const blogPosts = await db.post.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
    take: 3,
    include: {
      translations: {
        where: { locale: 'pt-BR' },
        take: 1,
      },
    },
  });

  // Pegar o primeiro banner ativo (se existir)
  const activeBanner = banners[0];

  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      {/* Header */}
      <header className="border-bottom bg-white">
        <div className="container py-3 d-flex justify-content-between align-items-center">
          <Link href="/" className="fw-bold text-decoration-none text-dark fs-4">nb-store</Link>
          <nav className="d-flex gap-3 small text-uppercase">
            <Link href="/" className="text-decoration-none text-dark">Home</Link>
            <Link href="/products" className="text-decoration-none text-dark">Produtos</Link>
            <Link href="/account" className="text-decoration-none text-dark">Minha Conta</Link>
            <Link href="/cart" className="text-decoration-none text-dark">🛒 Carrinho</Link>
          </nav>
        </div>
      </header>

      <main className="flex-fill">
        {/* Hero Section / Banner */}
        {activeBanner ? (
          <section 
            className="text-white py-5"
            style={{
              minHeight: 400,
              backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.7), rgba(0,0,0,0.3)), url(${activeBanner.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="container">
              <div className="row align-items-center" style={{ minHeight: 300 }}>
                <div className="col-lg-8">
                  <h1 className="display-4 fw-bold mb-3">{activeBanner.title}</h1>
                  {activeBanner.subtitle && (
                    <p className="lead mb-4">{activeBanner.subtitle}</p>
                  )}
                  {activeBanner.linkUrl && (
                    <a href={activeBanner.linkUrl} className="btn btn-light btn-lg">
                      {activeBanner.buttonText || 'Saiba Mais'}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="bg-primary text-white py-5">
            <div className="container">
              <div className="row align-items-center">
                <div className="col-lg-6">
                  <h1 className="display-4 fw-bold mb-3">NoBugs Store</h1>
                  <p className="lead mb-4">
                    Produtos digitais e físicos de alta qualidade. Entrega rápida e segura.
                  </p>
                  <Link href="/products" className="btn btn-light btn-lg">
                    Ver Produtos
                  </Link>
                </div>
                <div className="col-lg-6 d-none d-lg-block text-center">
                  <svg width="300" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="50" y="30" width="200" height="140" rx="10" fill="white" fillOpacity="0.2"/>
                    <rect x="70" y="50" width="60" height="60" rx="5" fill="white" fillOpacity="0.3"/>
                    <rect x="140" y="50" width="60" height="60" rx="5" fill="white" fillOpacity="0.3"/>
                    <rect x="70" y="120" width="130" height="10" rx="2" fill="white" fillOpacity="0.3"/>
                    <rect x="70" y="135" width="80" height="10" rx="2" fill="white" fillOpacity="0.3"/>
                  </svg>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Categorias */}
        <section className="py-5 bg-light">
          <div className="container">
            <h2 className="h4 mb-4">Categorias</h2>
            {categories.length === 0 ? (
              <p className="text-muted">Nenhuma categoria cadastrada.</p>
            ) : (
              <div className="row g-3">
                {categories.map((cat) => (
                  <div key={cat.id} className="col-6 col-md-4 col-lg-3">
                    <Link
                      href={`/category/${cat.slug}`}
                      className="card h-100 text-decoration-none border-0 shadow-sm"
                    >
                      <div className="card-body text-center">
                        <div className="mb-2">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                          </svg>
                        </div>
                        <h5 className="card-title h6 mb-1">{cat.name}</h5>
                        <small className="text-muted">
                          {cat._count.products} {cat._count.products === 1 ? 'produto' : 'produtos'}
                        </small>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Produtos em Destaque */}
        <section id="produtos" className="py-5">
          <div className="container">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="h4 mb-0">Produtos em Destaque</h2>
              <Link href="/products" className="btn btn-outline-primary btn-sm">
                Ver todos
              </Link>
            </div>

            {featuredProducts.length === 0 ? (
              <p className="text-muted">Nenhum produto cadastrado ainda.</p>
            ) : (
              <div className="row g-4">
                {featuredProducts.map((product) => {
                  const imageUrl = product.images[0]?.url;
                  const price = toNumber(product.variants[0]?.price ?? product.price);

                  return (
                    <div key={product.id} className="col-6 col-md-4 col-lg-3">
                      <Link
                        href={`/product/${product.slug}`}
                        className="card h-100 text-decoration-none border-0 shadow-sm"
                      >
                        <div className="position-relative" style={{ paddingTop: '100%' }}>
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={product.name}
                              className="position-absolute top-0 start-0 w-100 h-100"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="position-absolute top-0 start-0 w-100 h-100 bg-secondary d-flex align-items-center justify-content-center">
                              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21 15 16 10 5 21"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="card-body">
                          <small className="text-muted d-block mb-1">{product.category?.name}</small>
                          <h5 className="card-title h6 mb-2 text-truncate">{product.name}</h5>
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-bold text-primary">{formatPrice(price)}</span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Benefícios */}
        <section className="py-5 bg-white">
          <div className="container">
            <div className="row text-center g-4">
              <div className="col-md-4">
                <div className="p-3">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary mb-3">
                    <rect x="1" y="3" width="15" height="13"/>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/>
                    <circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                  <h5>Frete Rápido</h5>
                  <p className="text-muted small">Entrega pelos Correios para todo o Brasil</p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary mb-3">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <h5>Compra Segura</h5>
                  <p className="text-muted small">Pagamento processado pelo PagSeguro</p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary mb-3">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <h5>Suporte</h5>
                  <p className="text-muted small">Atendimento via email e Discord</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Blog - Últimos Posts */}
        {blogPosts.length > 0 && (
          <section className="py-5 bg-light">
            <div className="container">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="h4 mb-0">
                  📝 Últimos do Blog
                </h2>
                <Link href="/blog" className="btn btn-outline-primary btn-sm">
                  Ver todos
                </Link>
              </div>

              <div className="row g-4">
                {blogPosts.map((post: any) => {
                  const translation = post.translations[0];
                  if (!translation) return null;

                  return (
                    <div key={post.id} className="col-md-4">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="card h-100 text-decoration-none border-0 shadow-sm"
                      >
                        <div className="card-body">
                          <small className="text-muted d-block mb-2">
                            📅 {formatDate(post.publishedAt || post.createdAt)}
                          </small>
                          <h5 className="card-title h6 text-dark mb-2">
                            {translation.title}
                          </h5>
                          {translation.excerpt && (
                            <p className="card-text text-muted small mb-0" style={{ 
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {translation.excerpt}
                            </p>
                          )}
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-top bg-white">
        <div className="container py-3 small text-muted">© {new Date().getFullYear()} nb-store</div>
      </footer>
    </div>
  );
}
