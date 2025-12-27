import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../../src/server/auth/options';
import { userHasPermission, userIsAdmin } from '../../../../../../src/server/auth/rbac';
import { prisma } from '../../../../../../src/server/db/client';

async function checkAuth() {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return { authorized: false, reason: 'Não autenticado' };
  }
  const isAdmin = await userIsAdmin(session.user.id);
  const canWrite = isAdmin || (await userHasPermission(session.user.id, 'catalog:write'));
  if (!canWrite) {
    return { authorized: false, reason: 'Sem permissão' };
  }
  return { authorized: true, userId: session.user.id };
}

// POST /api/admin/products/[id]/variants - criar variante
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { id: productId } = await params;
  
  try {
    const body = await req.json();
    const { name, sku, price, stock, active } = body;

    if (!name || !sku || !price) {
      return NextResponse.json({ error: 'Nome, SKU e preço são obrigatórios' }, { status: 400 });
    }

    // Verificar se o produto existe
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Verificar se SKU já existe
    const existingSku = await prisma.productVariant.findFirst({ where: { sku } });
    if (existingSku) {
      return NextResponse.json({ error: 'SKU já existe' }, { status: 400 });
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        name,
        sku,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        active: active !== false, // default true
      },
    });

    return NextResponse.json({ variant });
  } catch (error) {
    console.error('Erro ao criar variante:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// GET /api/admin/products/[id]/variants - listar variantes
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { id: productId } = await params;

  try {
    const variants = await prisma.productVariant.findMany({
      where: { productId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ variants });
  } catch (error) {
    console.error('Erro ao listar variantes:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
