import { prisma } from '../../src/server/db/client';
import { getServerLocale } from '../../src/i18n/server';
import { defaultLocale } from '../../src/i18n/config';
import HomeAltContent from '../../src/components/store/HomeAltContent';
import HomeAltShell from '../../src/components/store/HomeAltShell';

// Type assertion para contornar cache de tipos do TypeScript
const db = prisma as any;

export default async function StoreHomeAlt() {
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

  // Buscar categorias pai com produtos ativos (no pai ou nas filhas)
  const parentCategoriesRaw = await db.category.findMany({
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

  const categories = parentCategoriesRaw
    .map((cat) => ({
      ...cat,
      _count: {
        products:
          cat._count.products +
          cat.children.reduce((sum, child) => sum + child._count.products, 0),
      },
    }))
    .filter((cat) => cat._count.products > 0);

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
