import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../src/server/auth/options';
import { userIsAdmin } from '../../../../../src/server/auth/rbac';
import { prisma } from '../../../../../src/server/db/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { productId, categoryId, guildId, roleId } = body;

    const rule = await prisma.discordRule.update({
      where: { id },
      data: {
        productId: productId || null,
        categoryId: categoryId || null,
        guildId,
        roleId: roleId || null,
      },
      include: {
        product: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ rule });
  } catch (error) {
    console.error('Erro ao atualizar regra de Discord:', error);
    return NextResponse.json({ error: 'Erro ao atualizar regra' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    await prisma.discordRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir regra de Discord:', error);
    return NextResponse.json({ error: 'Erro ao excluir regra' }, { status: 500 });
  }
}
