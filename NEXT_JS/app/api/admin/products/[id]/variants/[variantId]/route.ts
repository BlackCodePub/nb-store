import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../../../src/server/auth/options';
import { userHasPermission, userIsAdmin } from '../../../../../../../src/server/auth/rbac';
import { prisma } from '../../../../../../../src/server/db/client';

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

// PUT /api/admin/products/[id]/variants/[variantId] - atualizar variante
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const auth = await checkAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { variantId } = await params;

  try {
    const body = await req.json();
    const { name, sku, price, stock, active } = body;

    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) {
      return NextResponse.json({ error: 'Variante não encontrada' }, { status: 404 });
    }

    // Se SKU mudou, verificar se já existe
    if (sku && sku !== variant.sku) {
      const existingSku = await prisma.productVariant.findFirst({
        where: { sku, NOT: { id: variantId } },
      });
      if (existingSku) {
        return NextResponse.json({ error: 'SKU já existe' }, { status: 400 });
      }
    }

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(name && { name }),
        ...(sku && { sku }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json({ variant: updated });
  } catch (error) {
    console.error('Erro ao atualizar variante:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id]/variants/[variantId] - excluir variante
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const auth = await checkAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { variantId } = await params;

  try {
    await prisma.productVariant.delete({ where: { id: variantId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir variante:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
