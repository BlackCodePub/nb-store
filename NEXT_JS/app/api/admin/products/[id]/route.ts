import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../src/server/auth/options';
import { userIsAdmin, userHasPermission } from '../../../../../src/server/auth/rbac';
import { prisma } from '../../../../../src/server/db/client';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const session = await getServerSession(buildAuthOptions('admin'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canView = isAdmin || (await userHasPermission(session.user.id, 'products.view'));
  
  if (!canView) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      variants: true,
      images: { orderBy: { position: 'asc' } },
      digitalAssets: true,
      _count: { select: { orderItems: true } },
    },
  });

  if (!product) {
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  }

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
      categoryId: product.categoryId,
      variants: product.variants,
      images: product.images,
      digitalAssets: product.digitalAssets,
      totalStock: product.variants.reduce((sum, v) => sum + v.stock, 0),
      orderCount: product._count.orderItems,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    },
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const session = await getServerSession(buildAuthOptions('admin'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canEdit = isAdmin || (await userHasPermission(session.user.id, 'products.edit'));
  
  if (!canEdit) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json();
  const { 
    name, nameEn, description, descriptionEn, price, currency, type, categoryId, active,
    metaTitle, metaDescription, weight, width, height, depth
  } = body;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  }

  if (name && name !== existing.name) {
    const newSlug = slugify(name);
    const duplicate = await prisma.product.findUnique({ where: { slug: newSlug } });
    if (duplicate && duplicate.id !== id) {
      return NextResponse.json({ error: 'Slug já existe' }, { status: 400 });
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(name && { name, slug: slugify(name) }),
      ...(nameEn !== undefined && { nameEn: nameEn || null }),
      ...(description !== undefined && { description: description || null }),
      ...(descriptionEn !== undefined && { descriptionEn: descriptionEn || null }),
      ...(price !== undefined && { price }),
      ...(currency && { currency }),
      ...(type && { type }),
      ...(categoryId !== undefined && { categoryId: categoryId || null }),
      ...(active !== undefined && { active }),
      ...(metaTitle !== undefined && { metaTitle: metaTitle || null }),
      ...(metaDescription !== undefined && { metaDescription: metaDescription || null }),
      ...(weight !== undefined && { weight: weight || null }),
      ...(width !== undefined && { width: width || null }),
      ...(height !== undefined && { height: height || null }),
      ...(depth !== undefined && { depth: depth || null }),
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      variants: true,
      _count: { select: { orderItems: true } },
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
      orderCount: product._count.orderItems,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(req, { params });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const session = await getServerSession(buildAuthOptions('admin'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canDelete = isAdmin || (await userHasPermission(session.user.id, 'products.delete'));
  
  if (!canDelete) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      _count: { select: { orderItems: true } },
    },
  });

  if (!product) {
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  }

  if (product._count.orderItems > 0) {
    return NextResponse.json(
      { error: 'Não é possível excluir produto com pedidos vinculados' },
      { status: 400 }
    );
  }

  await prisma.product.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
