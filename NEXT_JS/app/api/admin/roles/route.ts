import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { userIsAdmin } from '../../../../src/server/auth/rbac';
import { prisma } from '../../../../src/server/db/client';

export async function GET() {
  const session = await getServerSession(buildAuthOptions('admin'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: { users: true },
      },
    },
    orderBy: { level: 'asc' },
  });

  const formattedRoles = roles.map((role) => ({
    id: role.id,
    name: role.name,
    level: role.level,
    isAdmin: role.isAdmin,
    permissions: role.permissions.map((rp) => rp.permission.key),
    userCount: role._count.users,
    createdAt: role.createdAt.toISOString(),
  }));

  return NextResponse.json({ roles: formattedRoles });
}

export async function POST(req: Request) {
  const session = await getServerSession(buildAuthOptions('admin'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json();
  const { name, level, isAdmin: roleIsAdmin, permissions } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
  }

  // Verificar se já existe
  const existing = await prisma.role.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: 'Role já existe' }, { status: 400 });
  }

  // Buscar ou criar permissões
  const permissionKeys = Array.isArray(permissions) ? permissions : [];
  
  const role = await prisma.role.create({
    data: {
      name,
      level: typeof level === 'number' ? level : 100,
      isAdmin: roleIsAdmin === true,
      permissions: {
        create: await Promise.all(
          permissionKeys.map(async (key: string) => {
            let perm = await prisma.permission.findUnique({ where: { key } });
            if (!perm) {
              perm = await prisma.permission.create({ data: { key } });
            }
            return { permissionId: perm.id };
          })
        ),
      },
    },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  return NextResponse.json({
    role: {
      id: role.id,
      name: role.name,
      level: role.level,
      isAdmin: role.isAdmin,
      permissions: role.permissions.map((rp) => rp.permission.key),
      createdAt: role.createdAt.toISOString(),
    },
  });
}
