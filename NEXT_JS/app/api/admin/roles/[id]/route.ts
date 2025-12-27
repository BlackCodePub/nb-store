import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../src/server/auth/options';
import { userIsAdmin } from '../../../../../src/server/auth/rbac';
import { prisma } from '../../../../../src/server/db/client';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const session = await getServerSession(buildAuthOptions('admin'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: {
        include: { permission: true },
      },
      _count: {
        select: { users: true },
      },
    },
  });

  if (!role) {
    return NextResponse.json({ error: 'Role não encontrada' }, { status: 404 });
  }

  return NextResponse.json({
    role: {
      id: role.id,
      name: role.name,
      level: role.level,
      isAdmin: role.isAdmin,
      permissions: role.permissions.map((rp) => rp.permission.key),
      userCount: role._count.users,
      createdAt: role.createdAt.toISOString(),
    },
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
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

  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Role não encontrada' }, { status: 404 });
  }

  // Verificar nome duplicado
  if (name && name !== existing.name) {
    const duplicate = await prisma.role.findUnique({ where: { name } });
    if (duplicate) {
      return NextResponse.json({ error: 'Nome já existe' }, { status: 400 });
    }
  }

  // Atualizar permissões
  const permissionKeys = Array.isArray(permissions) ? permissions : undefined;

  await prisma.$transaction(async (tx) => {
    // Atualizar role
    await tx.role.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(typeof level === 'number' && { level }),
        ...(typeof roleIsAdmin === 'boolean' && { isAdmin: roleIsAdmin }),
      },
    });

    // Atualizar permissões se fornecidas
    if (permissionKeys) {
      // Remover todas as permissões atuais
      await tx.rolePermission.deleteMany({ where: { roleId: id } });

      // Adicionar novas permissões
      for (const key of permissionKeys) {
        let perm = await tx.permission.findUnique({ where: { key } });
        if (!perm) {
          perm = await tx.permission.create({ data: { key } });
        }
        await tx.rolePermission.create({
          data: { roleId: id, permissionId: perm.id },
        });
      }
    }
  });

  const updated = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  return NextResponse.json({
    role: {
      id: updated!.id,
      name: updated!.name,
      level: updated!.level,
      isAdmin: updated!.isAdmin,
      permissions: updated!.permissions.map((rp) => rp.permission.key),
      createdAt: updated!.createdAt.toISOString(),
    },
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const session = await getServerSession(buildAuthOptions('admin'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true } },
    },
  });

  if (!role) {
    return NextResponse.json({ error: 'Role não encontrada' }, { status: 404 });
  }

  // Verificar se tem usuários
  if (role._count.users > 0) {
    return NextResponse.json(
      { error: 'Não é possível excluir role com usuários vinculados' },
      { status: 400 }
    );
  }

  await prisma.role.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
