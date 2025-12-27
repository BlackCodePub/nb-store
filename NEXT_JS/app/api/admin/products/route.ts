import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { userIsAdmin, userHasPermission } from '../../../../src/server/auth/rbac';
import { prisma } from '../../../../src/server/db/client';

export async function GET(req: Request) {
  const session = await getServerSession(buildAuthOptions('admin'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canView = isAdmin || (await userHasPermission(session.user.id, 'products.view'));
  
  if (!canView) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // physical | digital
  const categoryId = searchParams.get('categoryId');
  const active = searchParams.get('active');
  const search = searchParams.get('search');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
  const offset = (page - 1) * limit;

  const where = {
    ...(type && { type }),
    ...(categoryId && { categoryId }),
    ...(active !== null && { active: active === 'true' }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { slug: { contains: search } },
      ],
    }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        variants: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            stock: true,
          },
          orderBy: { price: 'asc' },
        },
        _count: {
          select: { orderItems: true, images: true },
        },
      },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.product.count({ where }),
  ]);

  const formattedProducts = products.map((prod) => ({
    id: prod.id,
    name: prod.name,
    nameEn: prod.nameEn,
    slug: prod.slug,
    description: prod.description,
    descriptionEn: prod.descriptionEn,
    price: prod.price,
    currency: prod.currency,
    type: prod.type,
    active: prod.active,
    // SEO
    metaTitle: prod.metaTitle,
    metaDescription: prod.metaDescription,
    // Peso e dimensões
    weight: prod.weight,
    width: prod.width,
    height: prod.height,
    depth: prod.depth,
    category: prod.category,
    variants: prod.variants,
    totalStock: prod.variants.reduce((sum, v) => sum + v.stock, 0),
    orderCount: prod._count.orderItems,
    imageCount: prod._count.images,
    createdAt: prod.createdAt.toISOString(),
    updatedAt: prod.updatedAt.toISOString(),
  }));

  return NextResponse.json({
    products: formattedProducts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export async function POST(req: Request) {
  const session = await getServerSession(buildAuthOptions('admin'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canCreate = isAdmin || (await userHasPermission(session.user.id, 'products.create'));
  
  if (!canCreate) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json();
  const { 
    name, nameEn, description, descriptionEn, price, currency, type, categoryId, active, variants,
    metaTitle, metaDescription, weight, width, height, depth
  } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
  }

  if (!price || typeof price !== 'number' || price <= 0) {
    return NextResponse.json({ error: 'Preço é obrigatório e deve ser positivo' }, { status: 400 });
  }

  const slug = slugify(name);

  // Verificar se já existe
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: 'Produto já existe' }, { status: 400 });
  }

  // Criar variante padrão se não houver variantes
  const variantData = Array.isArray(variants) && variants.length > 0
    ? variants.map((v: { name: string; sku: string; price?: number; stock?: number }) => ({
        name: v.name,
        sku: v.sku || `${slug}-${slugify(v.name)}`.toUpperCase(),
        price: v.price || price,
        stock: v.stock || 0,
      }))
    : [{
        name: 'Default',
        sku: `${slug}-default`.toUpperCase(),
        price,
        stock: 0,
      }];

  const product = await prisma.product.create({
    data: {
      name,
      nameEn: nameEn || null,
      slug,
      description: description || null,
      descriptionEn: descriptionEn || null,
      price,
      currency: currency || 'BRL',
      type: type || 'physical',
      categoryId: categoryId || null,
      active: active !== false,
      // SEO
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      // Peso e dimensões
      weight: weight || null,
      width: width || null,
      height: height || null,
      depth: depth || null,
      variants: {
        create: variantData,
      },
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      variants: true,
    },
  });

  return NextResponse.json({
    product: {
      id: product.id,
      name: product.name,
      nameEn: product.nameEn,
      slug: product.slug,
      description: product.description,
      descriptionEn: product.descriptionEn,
      price: product.price,
      currency: product.currency,
      type: product.type,
      active: product.active,
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      weight: product.weight,
      width: product.width,
      height: product.height,
      depth: product.depth,
      category: product.category,
      variants: product.variants,
      totalStock: product.variants.reduce((sum, v) => sum + v.stock, 0),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    },
  });
}
