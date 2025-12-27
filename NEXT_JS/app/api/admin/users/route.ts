import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { userIsAdmin } from '../../../../src/server/auth/rbac';
import { prisma } from '../../../../src/server/db/client';

export async function GET(request: NextRequest) {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const where: {
    OR?: Array<{ name?: { contains: string }; email?: { contains: string } }>;
    role?: string;
  } = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }

  if (role) {
    where.role = role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        roles: {
          include: { role: true },
        },
        createdAt: true,
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users: users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      createdAt: u.createdAt,
      roles: u.roles.map(ur => ur.role),
      ordersCount: u._count.orders,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function PUT(request: NextRequest) {
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
    const { userId, roleId, name } = body;

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
    }

    // Não permitir que o admin altere seus próprios roles
    if (userId === session.user.id && roleId) {
      return NextResponse.json({ error: 'Você não pode alterar seu próprio role' }, { status: 400 });
    }

    // Atualizar nome se fornecido
    if (name) {
      await prisma.user.update({
        where: { id: userId },
        data: { name },
      });
    }

    // Atualizar roles se fornecido
    if (roleId) {
      // Remove all existing roles and add the new one
      await prisma.$transaction([
        prisma.userRole.deleteMany({ where: { userId } }),
        prisma.userRole.create({ data: { userId, roleId } }),
      ]);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        roles: { include: { role: true } },
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 });
  }
}
