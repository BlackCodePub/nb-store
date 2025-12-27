import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { userIsAdmin, userHasPermission } from '../../../../src/server/auth/rbac';
import { prisma } from '../../../../src/server/db/client';

export async function GET() {
  const session = await getServerSession(buildAuthOptions('admin'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canView = isAdmin || (await userHasPermission(session.user.id, 'categories.view'));
  
  if (!canView) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { products: true },
      },
      parent: {
        select: { id: true, name: true },
      },
      children: {
        select: { id: true, name: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const formattedCategories = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    nameEn: cat.nameEn,
    slug: cat.slug,
    description: cat.description,
    descriptionEn: cat.descriptionEn,
    parentId: cat.parentId,
    parent: cat.parent,
    children: cat.children,
    productCount: cat._count.products,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  }));

  return NextResponse.json({ categories: formattedCategories });
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
  const canCreate = isAdmin || (await userHasPermission(session.user.id, 'categories.create'));
  
  if (!canCreate) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json();
  const { name, nameEn, description, descriptionEn, parentId } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
  }

  const slug = slugify(name);

  // Verificar se já existe
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: 'Categoria já existe' }, { status: 400 });
  }

  // Validar parentId se fornecido
  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (!parent) {
      return NextResponse.json({ error: 'Categoria pai não encontrada' }, { status: 400 });
    }
  }

  const category = await prisma.category.create({
    data: {
      name,
      nameEn: nameEn || null,
      slug,
      description: description || null,
      descriptionEn: descriptionEn || null,
      parentId: parentId || null,
    },
    include: {
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
      productCount: 0,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    },
  });
}
