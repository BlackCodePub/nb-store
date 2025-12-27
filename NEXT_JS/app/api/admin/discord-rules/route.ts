import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { userIsAdmin } from '../../../../src/server/auth/rbac';
import { prisma } from '../../../../src/server/db/client';

export async function GET() {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const rules = await prisma.discordRule.findMany({
    include: {
      product: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ rules });
}

export async function POST(request: NextRequest) {
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

    if (!guildId) {
      return NextResponse.json({ error: 'Guild ID é obrigatório' }, { status: 400 });
    }

    if (!productId && !categoryId) {
      return NextResponse.json({ error: 'Produto ou categoria é obrigatório' }, { status: 400 });
    }

    const rule = await prisma.discordRule.create({
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

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar regra de Discord:', error);
    return NextResponse.json({ error: 'Erro ao criar regra' }, { status: 500 });
  }
}
