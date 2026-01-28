import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '../../../../src/server/db/client';
import { AddToCartButton } from './AddToCartButton';
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
}

export default async function ProductPage({ params }: PageProps) {
  const locale = await getServerLocale();
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      nameEn: true,
      slug: true,
      description: true,
      descriptionEn: true,
      price: true,
      type: true,
      active: true,
      category: true,
      images: { orderBy: { position: 'asc' } },
      variants: { orderBy: { name: 'asc' } },
    },
  });

  if (!product || !product.active) {
    notFound();
  }

  const hasMultipleVariants = product.variants.length > 1;
  const defaultVariant = product.variants[0];
  const mainImage = product.images[0]?.url || null;

  const productName = getTranslatedName(product, locale);
  const productDescription = getTranslatedDescription(product, locale);

  return (
    <div className="container py-5">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/">Home</Link>
          </li>
          {product.category && (
            <li className="breadcrumb-item">
              <Link href={`/category/${product.category.slug}`}>{product.category.name}</Link>
            </li>
          )}
          <li className="breadcrumb-item active" aria-current="page">
            {productName}
          </li>
        </ol>
      </nav>

      <div className="row g-5">
        {/* Galeria de Imagens */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div
              className="card-img-top bg-light d-flex align-items-center justify-content-center"
              style={{ height: 400, overflow: 'hidden' }}
            >
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={productName}
                  className="img-fluid"
                  style={{ objectFit: 'contain', maxHeight: '100%' }}
                />
              ) : (
                <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
              )}
            </div>
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="d-flex gap-2 mt-3 overflow-auto">
              {product.images.map((img, idx) => (
                <div
                  key={img.id}
                  className={`border rounded ${idx === 0 ? 'border-primary border-2' : ''}`}
                  style={{ width: 80, height: 80, flexShrink: 0, overflow: 'hidden' }}
                >
                  <img
                    src={img.url}
                    alt={`${productName} - ${idx + 1}`}
                    className="img-fluid"
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Informações do Produto */}
        <div className="col-lg-6">
          <div className="mb-3">
            {product.category && (
              <Link
                href={`/category/${product.category.slug}`}
                className="text-decoration-none text-muted small"
              >
                {getTranslatedName(product.category, locale)}
              </Link>
            )}
            <h1 className="h2 mb-2">{productName}</h1>
            {product.type === 'digital' && (
              <span className="badge bg-info text-dark mb-3">Produto Digital</span>
            )}
          </div>

          {/* Preço */}
          <div className="mb-4">
            <span className="h3 text-primary fw-bold">
              {formatPrice(defaultVariant?.price ?? product.price, locale)}
            </span>
            <small className="text-muted d-block mt-1">
              ou em até 12x no cartão
            </small>
          </div>

          {/* Descrição */}
          {productDescription && (
            <div className="mb-4">
              <h5 className="h6 text-muted mb-2">Descrição</h5>
              <p className="mb-0">{productDescription}</p>
            </div>
          )}

          {/* Seleção de Variante e Adicionar ao Carrinho */}
          <AddToCartButton
            productId={product.id}
            productName={productName}
            variants={product.variants.map((v) => ({
              id: v.id,
              name: v.name,
              price: v.price ?? product.price,
              stock: v.stock,
            }))}
            hasMultipleVariants={hasMultipleVariants}
          />

          {/* Informações adicionais */}
          <div className="mt-4 pt-4 border-top">
            <div className="row g-3">
              <div className="col-6">
                <div className="d-flex align-items-center gap-2 text-muted small">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <span>Pagamento Seguro</span>
                </div>
              </div>
              <div className="col-6">
                <div className="d-flex align-items-center gap-2 text-muted small">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="1" y="3" width="15" height="13" rx="2"/>
                    <path d="M16 8h2l4 4v5a1 1 0 01-1 1h-1"/>
                  </svg>
                  <span>{product.type === 'digital' ? 'Entrega Imediata' : 'Envio pelos Correios'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SKU / Info técnica */}
      {defaultVariant && (
        <div className="mt-5 pt-4 border-top">
          <small className="text-muted">
            SKU: {defaultVariant.sku}
          </small>
        </div>
      )}
    </div>
  );
}
