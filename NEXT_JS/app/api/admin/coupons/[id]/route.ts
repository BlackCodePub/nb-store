import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../src/server/auth/options';
import { userIsAdmin, userHasPermission } from '../../../../../src/server/auth/rbac';
import { prisma } from '../../../../../src/server/db/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canView = isAdmin || await userHasPermission(session.user.id, 'coupons:read');
  if (!canView) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const coupon = await prisma.coupon.findUnique({
    where: { id },
    include: {
      _count: { select: { redemptions: true } },
    },
  });
  if (!coupon) {
    return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ coupon });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canEdit = isAdmin || await userHasPermission(session.user.id, 'coupons:write');
  if (!canEdit) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      code,
      type,
      value,
      minOrderValue,
      maxUsesTotal,
      maxUsesPerUser,
      startsAt,
      endsAt,
      isActive,
    } = body;

    // Verificar se o novo código já existe em outro cupom
    if (code) {
      const existing = await prisma.coupon.findFirst({
        where: {
          code: code.toUpperCase(),
          id: { not: id },
        },
      });
      if (existing) {
        return NextResponse.json({ error: 'Já existe um cupom com este código' }, { status: 400 });
      }
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code: code ? code.toUpperCase() : undefined,
        type,
        value: value !== undefined ? parseInt(value) : undefined,
        minSubtotalCents: minOrderValue ? parseInt(minOrderValue) * 100 : null,
        maxUsesTotal: maxUsesTotal ? parseInt(maxUsesTotal) : null,
        maxUsesPerUser: maxUsesPerUser ? parseInt(maxUsesPerUser) : null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        isActive,
      },
    });

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error('Erro ao atualizar cupom:', error);
    return NextResponse.json({ error: 'Erro ao atualizar cupom' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canEdit = isAdmin || await userHasPermission(session.user.id, 'coupons:write');
  if (!canEdit) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const coupon = await prisma.coupon.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error('Erro ao atualizar cupom:', error);
    return NextResponse.json({ error: 'Erro ao atualizar cupom' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canDelete = isAdmin || await userHasPermission(session.user.id, 'coupons:delete');
  if (!canDelete) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    await prisma.coupon.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir cupom:', error);
    return NextResponse.json({ error: 'Erro ao excluir cupom' }, { status: 500 });
  }
}
