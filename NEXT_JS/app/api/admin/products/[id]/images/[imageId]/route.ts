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
  const canImages = isAdmin || (await userHasPermission(session.user.id, 'catalog:images'));
  const canWrite = isAdmin || (await userHasPermission(session.user.id, 'catalog:write'));
  if (!canImages && !canWrite) {
    return { authorized: false, reason: 'Sem permissão' };
  }
  return { authorized: true, userId: session.user.id };
}

// DELETE /api/admin/products/[id]/images/[imageId] - excluir imagem
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const auth = await checkAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { imageId } = await params;

  try {
    await prisma.productImage.delete({ where: { id: imageId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir imagem:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT /api/admin/products/[id]/images/[imageId] - atualizar posição da imagem
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const auth = await checkAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { imageId } = await params;

  try {
    const body = await req.json();
    const { position, variantId } = body;

    const updated = await prisma.productImage.update({
      where: { id: imageId },
      data: {
        ...(position !== undefined && { position: parseInt(position) }),
        ...(variantId !== undefined && { variantId: variantId || null }),
      },
    });

    return NextResponse.json({ image: updated });
  } catch (error) {
    console.error('Erro ao atualizar imagem:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
