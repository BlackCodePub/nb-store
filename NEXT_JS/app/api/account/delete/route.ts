import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { prisma } from '../../../../src/server/db/client';
import bcrypt from 'bcryptjs';

// DELETE - Excluir conta do usuário
export async function DELETE(req: Request) {
  const session = await getServerSession(buildAuthOptions('store'));

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { password } = body || {};

  // Buscar usuário com hash da senha
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  // Se o usuário tem senha, verificar antes de excluir
  if (user.passwordHash) {
    if (!password) {
      return NextResponse.json({ error: 'Senha obrigatória para excluir conta' }, { status: 400 });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 400 });
    }
  }

  // Excluir usuário (cascade vai excluir dados relacionados)
  await prisma.user.delete({
    where: { id: session.user.id },
  });

  return NextResponse.json({ ok: true, message: 'Conta excluída com sucesso' });
}
