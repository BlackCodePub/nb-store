import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { rateLimitByRequest } from '../../../../src/server/utils/rate-limit';
import { prisma } from '../../../../src/server/db/client';

export async function POST(req: Request) {
  const limit = await rateLimitByRequest(req, { prefix: 'auth:reset-confirm:', limit: 5, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'muitas tentativas, tente mais tarde' }, { status: 429, headers: limit.headers });
  }

  const body = await req.json().catch(() => null);
  if (!body?.token || !body?.email || !body?.password) {
    return NextResponse.json({ error: 'dados incompletos' }, { status: 400, headers: limit.headers });
  }

  const { token, email, password } = body;

  if (password.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres' }, { status: 400, headers: limit.headers });
  }

  try {
    // Buscar token válido
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: `reset:${email.toLowerCase().trim()}`,
        token,
        expires: { gt: new Date() },
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Link inválido ou expirado. Solicite um novo link de recuperação.' },
        { status: 400, headers: limit.headers }
      );
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 400, headers: limit.headers }
      );
    }

    // Atualizar senha
    const passwordHash = await hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Deletar token usado
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token,
        },
      },
    });

    return NextResponse.json({ ok: true, message: 'Senha alterada com sucesso!' }, { headers: limit.headers });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return NextResponse.json({ error: 'Erro ao processar solicitação' }, { status: 500, headers: limit.headers });
  }
}
