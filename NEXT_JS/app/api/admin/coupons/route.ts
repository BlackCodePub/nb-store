import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { userIsAdmin, userHasPermission } from '../../../../src/server/auth/rbac';
import { prisma } from '../../../../src/server/db/client';

export async function GET(request: NextRequest) {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canView = isAdmin || await userHasPermission(session.user.id, 'coupons:read');
  if (!canView) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const active = searchParams.get('active');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const where: {
    code?: { contains: string };
    isActive?: boolean;
  } = {};

  if (search) {
    where.code = { contains: search };
  }

  if (active !== null && active !== '') {
    where.isActive = active === 'true';
  }

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      include: {
        _count: { select: { redemptions: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.coupon.count({ where }),
  ]);

  return NextResponse.json({
    coupons: coupons.map(c => ({
      ...c,
      usageCount: c._count.redemptions,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canCreate = isAdmin || await userHasPermission(session.user.id, 'coupons:write');
  if (!canCreate) {
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

    if (!code || !type || value === undefined) {
      return NextResponse.json({ error: 'Código, tipo e valor são obrigatórios' }, { status: 400 });
    }

    // Verificar se já existe
    const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Já existe um cupom com este código' }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        type,
        value: parseInt(value), // Valor em centavos ou porcentagem
        minSubtotalCents: minOrderValue ? parseInt(minOrderValue) * 100 : null,
        maxUsesTotal: maxUsesTotal ? parseInt(maxUsesTotal) : null,
        maxUsesPerUser: maxUsesPerUser ? parseInt(maxUsesPerUser) : null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar cupom:', error);
    return NextResponse.json({ error: 'Erro ao criar cupom' }, { status: 500 });
  }
}
