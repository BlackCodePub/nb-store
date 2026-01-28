import Link from 'next/link';
import { prisma } from '../src/server/db/client';
import type { Decimal } from '@prisma/client/runtime/library';
import UserMenuDropdown from '../src/components/store/UserMenuDropdown';
import NewsletterForm from '../src/components/store/NewsletterForm';
import BannerSlider from '../src/components/store/BannerSlider';
import HomeAltContent from '../src/components/store/HomeAltContent';
import HomeAltShell from '../src/components/store/HomeAltShell';
import ThemeToggleButton from '../src/components/ui/ThemeToggleButton';
import { getServerLocale } from '../src/i18n/server';
import { defaultLocale } from '../src/i18n/config';

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

async function getParentCategoriesWithChildProducts(db: typeof prisma) {
  const parents = await db.category.findMany({
    where: {
      parentId: null,
      OR: [
        { products: { some: { active: true } } },
        { children: { some: { products: { some: { active: true } } } } },
      ],
    },
    include: {
      _count: {
        select: {
          products: { where: { active: true } },
        },
      },
      children: {
        include: {
          _count: { select: { products: { where: { active: true } } } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return parents
    .map((cat) => ({
      ...cat,
      _count: {
        products:
          cat._count.products +
          cat.children.reduce((sum, child) => sum + child._count.products, 0),
      },
    }))
    .filter((cat) => cat._count.products > 0);
}

export default async function HomePage() {
  const [themeSetting, storeNameSetting] = await Promise.all([
    db.setting.findUnique({ where: { key: 'storeTheme' } }),
    db.setting.findUnique({ where: { key: 'storeName' } }),
  ]);
  let storeTheme = 'default';
  if (themeSetting?.value) {
    try {
      storeTheme = JSON.parse(themeSetting.value);
    } catch {
      storeTheme = themeSetting.value;
    }
  }

  let storeName = 'NoBugs Store';
  if (storeNameSetting?.value) {
    try {
      storeName = JSON.parse(storeNameSetting.value);
    } catch {
      storeName = storeNameSetting.value;
    }
  }

  if (storeTheme === 'alt') {
    const locale = await getServerLocale();
    const translationLocales = locale === defaultLocale ? [defaultLocale] : [locale, defaultLocale];
    const now = new Date();

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

    const categories = await getParentCategoriesWithChildProducts(db);

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
      <HomeAltShell>
        <HomeAltContent
          locale={locale}
          banners={banners}
          categories={categories}
          newProducts={newProducts}
          featuredProducts={featuredProducts}
          blogPosts={blogPosts}
        />
      </HomeAltShell>
    );
  }

  if (storeTheme === 'development') {
    return (
      <div className="min-vh-100 d-flex flex-column bg-light">
        <main className="flex-fill">
          {/* Banner estático */}
          <section className="bg-dark text-white py-5">
            <div className="container text-center">
              <h1 className="display-6 fw-bold mb-3">{storeName}</h1>
              <p className="lead mb-0">Estamos preparando uma nova experiência para você.</p>
            </div>
          </section>

          {/* Seção Desenvolvimento */}
          <section className="py-5">
            <div className="container">
              <div className="row justify-content-center">
                <div className="col-lg-7 text-center">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body py-5">
                      <i className="bi bi-code-slash text-primary" style={{ fontSize: '2.5rem' }}></i>
                      <h2 className="h4 mt-3 mb-2">Site em desenvolvimento</h2>
                      <p className="text-muted mb-0">
                        Em breve você poderá navegar por nossos conteúdos. Enquanto isso, deixe seu e-mail.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

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
                    Cadastre-se para receber o lançamento em primeira mão.
                  </p>
                  <NewsletterForm />
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-top bg-white">
          <div className="container py-3 small text-muted">© {new Date().getFullYear()} nb-store</div>
        </footer>
      </div>
    );
  }

  if (storeTheme === 'maintenance') {
    return (
      <div className="min-vh-100 d-flex flex-column bg-light">
        {/* Header simples com menu superior */}
        <header className="border-bottom bg-white sticky-top">
          <div className="container py-3 d-flex justify-content-between align-items-center">
            <Link href="/" className="text-decoration-none">
              <h1 className="h4 mb-0 fw-bold text-primary">
                <i className="bi bi-bug me-2"></i>
                {storeName}
              </h1>
            </Link>
            <div className="d-flex align-items-center gap-3">
              <ThemeToggleButton />
              <UserMenuDropdown />
            </div>
          </div>
        </header>

        <main className="flex-fill">
          {/* Banner estático */}
          <section className="bg-dark text-white py-5">
            <div className="container text-center">
              <h1 className="display-6 fw-bold mb-3">{storeName}</h1>
              <p className="lead mb-0">Estamos realizando melhorias temporárias.</p>
            </div>
          </section>

          {/* Seção Manutenção */}
          <section className="py-5">
            <div className="container">
              <div className="row justify-content-center">
                <div className="col-lg-7 text-center">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body py-5">
                      <i className="bi bi-tools text-warning" style={{ fontSize: '2.5rem' }}></i>
                      <h2 className="h4 mt-3 mb-2">Site em manutenção</h2>
                      <p className="text-muted mb-0">
                        Voltamos em breve. Deixe seu e-mail para avisarmos quando o site estiver no ar.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

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
                    Cadastre-se para receber o retorno do site.
                  </p>
                  <NewsletterForm />
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-top bg-white">
          <div className="container py-3 small text-muted">© {new Date().getFullYear()} nb-store</div>
        </footer>
      </div>
    );
  }

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
  const categories = await getParentCategoriesWithChildProducts(db);

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

  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      {/* Header */}
      <header className="border-bottom bg-white">
        <div className="container py-3 d-flex justify-content-between align-items-center">
          <Link href="/" className="text-decoration-none">
            <h1 className="h4 mb-0 fw-bold text-primary">
              <i className="bi bi-bug me-2"></i>
              {storeName}
            </h1>
          </Link>
          <div className="d-flex align-items-center gap-3">
            <nav className="d-flex gap-3 small text-uppercase">
              <Link href="/" className="text-decoration-none text-dark">Home</Link>
              <Link href="/products" className="text-decoration-none text-dark">Produtos</Link>
              <Link href="/cart" className="text-decoration-none text-dark">🛒 Carrinho</Link>
            </nav>
            <UserMenuDropdown />
          </div>
        </div>
      </header>

      <main className="flex-fill">
        {/* Hero Section / Banner */}
        <BannerSlider banners={banners} />

        {categories.length > 0 && (
          <section className="py-3 bg-white border-bottom">
            <div className="container">
              <div className="d-flex flex-wrap gap-2">
                <Link href="/products" className="btn btn-sm btn-outline-primary">
                  Todas
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/products?category=${cat.slug}`}
                    className="btn btn-sm btn-outline-primary"
                  >
                    {cat.name}
                  </Link>
                ))}
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
                      href={`/products?category=${cat.slug}`}
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
      </main>

      {/* Footer */}
      <footer className="border-top bg-white">
        <div className="container py-3 small text-muted">© {new Date().getFullYear()} nb-store</div>
      </footer>
    </div>
  );
}
