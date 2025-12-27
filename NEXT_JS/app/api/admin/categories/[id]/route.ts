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
  const canView = isAdmin || (await userHasPermission(session.user.id, 'categories.view'));
  
  if (!canView) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true } },
      parent: { select: { id: true, name: true } },
      children: { select: { id: true, name: true } },
    },
  });

  if (!category) {
    return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
  }

  return NextResponse.json({
    category: {
      id: category.id,
      name: category.name,
      nameEn: category.nameEn,
      slug: category.slug,
      description: category.description,
      descriptionEn: category.descriptionEn,
      parentId: category.parentId,
      parent: category.parent,
      children: category.children,
      productCount: category._count.products,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
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
  const canEdit = isAdmin || (await userHasPermission(session.user.id, 'categories.edit'));
  
  if (!canEdit) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json();
  const { name, nameEn, description, descriptionEn, parentId } = body;

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
  }

  // Verificar slug duplicado se nome mudou
  if (name && name !== existing.name) {
    const newSlug = slugify(name);
    const duplicate = await prisma.category.findUnique({ where: { slug: newSlug } });
    if (duplicate && duplicate.id !== id) {
      return NextResponse.json({ error: 'Slug já existe' }, { status: 400 });
    }
  }

  // Validar parentId
  if (parentId) {
    // Não pode ser pai de si mesmo
    if (parentId === id) {
      return NextResponse.json({ error: 'Categoria não pode ser pai de si mesma' }, { status: 400 });
    }
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (!parent) {
      return NextResponse.json({ error: 'Categoria pai não encontrada' }, { status: 400 });
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(name && { name, slug: slugify(name) }),
      ...(nameEn !== undefined && { nameEn: nameEn || null }),
      ...(description !== undefined && { description: description || null }),
      ...(descriptionEn !== undefined && { descriptionEn: descriptionEn || null }),
      ...(parentId !== undefined && { parentId: parentId || null }),
    },
    include: {
      _count: { select: { products: true } },
      parent: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    category: {
      id: category.id,
      name: category.name,
      nameEn: category.nameEn,
      slug: category.slug,
      description: category.description,
      descriptionEn: category.descriptionEn,
      parentId: category.parentId,
      parent: category.parent,
      productCount: category._count.products,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    },
  });
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
  const canDelete = isAdmin || (await userHasPermission(session.user.id, 'categories.delete'));
  
  if (!canDelete) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true } },
    },
  });

  if (!category) {
    return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
  }

  // Remover categoria dos produtos antes de deletar
  await prisma.product.updateMany({
    where: { categoryId: id },
    data: { categoryId: null },
  });

  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
