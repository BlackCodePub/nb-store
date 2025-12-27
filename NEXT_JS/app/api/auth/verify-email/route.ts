import { NextResponse } from 'next/server';
import { rateLimitByRequest } from '../../../../src/server/utils/rate-limit';
import { prisma } from '../../../../src/server/db/client';

export async function GET(req: Request) {
  const limit = await rateLimitByRequest(req, { prefix: 'auth:verify:', limit: 10, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'muitas tentativas, tente mais tarde' }, { status: 429, headers: limit.headers });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const email = url.searchParams.get('email');

  if (!token || !email) {
    return NextResponse.json({ error: 'Link inválido' }, { status: 400, headers: limit.headers });
  }

  try {
    // Buscar token válido
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: `verify:${email.toLowerCase().trim()}`,
        token,
        expires: { gt: new Date() },
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Link inválido ou expirado. Solicite um novo link de verificação.' },
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

    if (user.emailVerified) {
      return NextResponse.json(
        { ok: true, message: 'E-mail já verificado anteriormente.' },
        { headers: limit.headers }
      );
    }

    // Marcar e-mail como verificado
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
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

    return NextResponse.json({ ok: true, message: 'E-mail verificado com sucesso!' }, { headers: limit.headers });
  } catch (error) {
    console.error('Erro ao verificar e-mail:', error);
    return NextResponse.json({ error: 'Erro ao processar verificação' }, { status: 500, headers: limit.headers });
  }
}
