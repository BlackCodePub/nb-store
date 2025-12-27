import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { prisma } from '../../../../src/server/db/client';
import bcrypt from 'bcryptjs';

// PUT - Alterar senha
export async function PUT(req: Request) {
  const session = await getServerSession(buildAuthOptions('store'));

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;

  // Validações
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'A nova senha deve ter pelo menos 6 caracteres' }, { status: 400 });
  }

  // Buscar usuário com hash da senha
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  // Se o usuário não tem senha (login via OAuth), não pode alterar
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: 'Sua conta usa login social. Não é possível alterar a senha.' },
      { status: 400 }
    );
  }

  // Verificar senha atual
  const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!isValidPassword) {
    return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });
  }

  // Hash da nova senha
  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  // Atualizar senha
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newPasswordHash },
  });

  return NextResponse.json({ ok: true, message: 'Senha alterada com sucesso' });
}
