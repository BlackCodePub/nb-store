import Link from 'next/link';
import { prisma } from '../../src/server/db/client';
import BannerSlider from '../../src/components/store/BannerSlider';
import NewsletterForm from '../../src/components/store/NewsletterForm';
import { defaultLocale } from '../../src/i18n/config';
import { getServerLocale } from '../../src/i18n/server';

// Type assertion para contornar cache de tipos do TypeScript
const db = prisma as any;

// Formatar preço em BRL
function formatPrice(price: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

// Formatar data para exibição
function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getTranslatedName<T extends { name: string; nameEn?: string | null }>(item: T, locale: string) {
  return locale === 'en-US' ? (item.nameEn || item.name) : item.name;
}

export default async function StoreHome() {
  const locale = await getServerLocale();
  const translationLocales = locale === defaultLocale ? [defaultLocale] : [locale, defaultLocale];
  // Força recompilação - timestamp: 2025-01-27-v3
  const now = new Date();

  // Buscar banners ativos PRIMEIRO para garantir execução
  let banners: any[] = [];
  try {
    banners = await db.banner.findMany({
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
  } catch (error) {
    console.error('[ERROR] Erro ao buscar banners:', error);
  }

  // Buscar categorias com contagem de produtos
  const categories = await db.category.findMany({
    include: {
      _count: { select: { products: true } },
    },
    orderBy: { name: 'asc' },
  });

  // Buscar produtos novos (últimos 4)
  const newProducts = await db.product.findMany({
    where: { active: true },
    include: {
      category: true,
      images: { orderBy: { position: 'asc' }, take: 1 },
      variants: { take: 1 },
    },
    orderBy: { createdAt: 'desc' },
    take: 4,
  });

  // Buscar produtos em destaque (mais vendidos - próximos 4)
  const featuredProducts = await db.product.findMany({
    where: { active: true },
    include: {
      category: true,
      images: { orderBy: { position: 'asc' }, take: 1 },
      variants: { take: 1 },
      _count: { select: { orderItems: true } },
    },
    orderBy: { orderItems: { _count: 'desc' } },
    take: 4,
  });

  // Buscar últimos posts publicados do blog (3)
  const blogPosts = await db.post.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
    take: 3,
    include: {
      translations: {
        where: { locale: { in: translationLocales } },
      },
    },
  });

  return (
    <>
      {/* Banner/Slider */}
      <BannerSlider banners={banners} />

      {/* Categorias */}
      <section className="py-5 bg-light">
        <div className="container">
          <h2 className="h4 mb-4">
            <i className="bi bi-grid me-2"></i>
            Categorias
          </h2>
          {categories.length === 0 ? (
            <p className="text-muted">Nenhuma categoria cadastrada.</p>
          ) : (
            <div className="row g-3">
              {categories.map((cat) => (
                <div key={cat.id} className="col-6 col-md-4 col-lg-3">
                  <Link
                    href={`/category/${cat.slug}`}
                    className="card h-100 text-decoration-none border-0 shadow-sm hover-shadow"
                  >
                    <div className="card-body text-center">
                      <div className="mb-2">
                        <i className="bi bi-folder2-open text-primary" style={{ fontSize: '2rem' }}></i>
                      </div>
                      <h5 className="card-title h6 mb-1">{getTranslatedName(cat, locale)}</h5>
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

      {/* Novidades */}
      <section className="py-5">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="h4 mb-0">
              <i className="bi bi-stars me-2 text-warning"></i>
              Novidades
            </h2>
            <Link href="/products?sort=newest" className="btn btn-outline-primary btn-sm">
              Ver todas
            </Link>
          </div>

          {newProducts.length === 0 ? (
            <div className="alert alert-info">
              Nenhum produto disponível no momento.
            </div>
          ) : (
            <div className="row g-4">
              {newProducts.map((product) => {
                const imageUrl = product.images[0]?.url || null;
                const price = product.variants[0]?.price ?? product.price;

                return (
                  <div key={product.id} className="col-6 col-md-4 col-lg-3">
                    <Link
                      href={`/product/${product.slug}`}
                      className="card h-100 text-decoration-none border-0 shadow-sm product-card"
                    >
                      <div className="position-relative">
                        <span className="badge bg-success position-absolute top-0 start-0 m-2">
                          Novo
                        </span>
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
                            <i className="bi bi-image text-white-50" style={{ fontSize: '3rem' }}></i>
                          )}
                        </div>
                      </div>
                      <div className="card-body">
                        {product.category && (
                          <small className="text-muted d-block mb-1">{product.category.name}</small>
                        )}
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
          )}
        </div>
      </section>

      {/* Mais Vendidos */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="h4 mb-0">
              <i className="bi bi-trophy me-2 text-warning"></i>
              Mais Vendidos
            </h2>
            <Link href="/products?sort=popular" className="btn btn-outline-primary btn-sm">
              Ver todos
            </Link>
          </div>

          {featuredProducts.length === 0 ? (
            <div className="alert alert-info">
              Nenhum produto disponível no momento.
            </div>
          ) : (
            <div className="row g-4">
              {featuredProducts.map((product) => {
                const imageUrl = product.images[0]?.url || null;
                const price = product.variants[0]?.price ?? product.price;

                return (
                  <div key={product.id} className="col-6 col-md-4 col-lg-3">
                    <Link
                      href={`/product/${product.slug}`}
                      className="card h-100 text-decoration-none border-0 shadow-sm product-card"
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
                          <i className="bi bi-image text-white-50" style={{ fontSize: '3rem' }}></i>
                        )}
                      </div>
                      <div className="card-body">
                        {product.category && (
                          <small className="text-muted d-block mb-1">{getTranslatedName(product.category, locale)}</small>
                        )}
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
          )}
        </div>
      </section>

      {/* Blog - Últimos Posts */}
      {blogPosts.length > 0 && (
        <section className="py-5">
          <div className="container">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="h4 mb-0">
                <i className="bi bi-journal-richtext me-2 text-primary"></i>
                Últimos do Blog
              </h2>
              <Link href="/blog" className="btn btn-outline-primary btn-sm">
                Ver todos
              </Link>
            </div>

            <div className="row g-4">
              {blogPosts.map((post) => {
                const translation = post.translations.find((t: { locale: string }) => t.locale === locale)
                  || post.translations.find((t: { locale: string }) => t.locale === defaultLocale)
                  || post.translations[0];
                if (!translation) return null;

                return (
                  <div key={post.id} className="col-md-4">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="card h-100 text-decoration-none border-0 shadow-sm"
                    >
                      <div className="card-body">
                        <small className="text-muted d-block mb-2">
                          <i className="bi bi-calendar me-1"></i>
                          {formatDate(post.publishedAt || post.createdAt, locale)}
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
                      <div className="card-footer bg-transparent border-0 pt-0">
                        <span className="text-primary small">
                          Ler mais <i className="bi bi-arrow-right"></i>
                        </span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="py-5 bg-primary text-white">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-6 text-center">
              <h2 className="h4 mb-3">
                <i className="bi bi-envelope-heart me-2"></i>
                Receba Novidades
              </h2>
              <p className="mb-4">
                Cadastre-se para receber ofertas exclusivas e lançamentos em primeira mão.
              </p>
              <NewsletterForm />
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-5">
        <div className="container">
          <div className="row g-4 text-center">
            <div className="col-md-4">
              <div className="p-3">
                <i className="bi bi-shield-check text-primary mb-3" style={{ fontSize: '2.5rem' }}></i>
                <h5>Pagamento Seguro</h5>
                <p className="text-muted small mb-0">
                  Transações protegidas com PagSeguro. Parcele em até 12x.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3">
                <i className="bi bi-truck text-primary mb-3" style={{ fontSize: '2.5rem' }}></i>
                <h5>Entrega Rápida</h5>
                <p className="text-muted small mb-0">
                  Frete calculado pelos Correios. Produtos digitais entregues na hora.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3">
                <i className="bi bi-discord text-primary mb-3" style={{ fontSize: '2.5rem' }}></i>
                <h5>Suporte</h5>
                <p className="text-muted small mb-0">
                  Atendimento via Discord. Comunidade ativa para ajudar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
