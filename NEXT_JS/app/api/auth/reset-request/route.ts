import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { rateLimitByRequest } from '../../../../src/server/utils/rate-limit';
import { prisma } from '../../../../src/server/db/client';
import { sendEmail, buildEmailFromTemplate } from '../../../../src/server/utils/email';

export async function POST(req: Request) {
  const limit = await rateLimitByRequest(req, { prefix: 'auth:reset:', limit: 5, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'muitas tentativas, tente mais tarde' }, { status: 429, headers: limit.headers });
  }

  const body = await req.json().catch(() => null);
  if (!body?.email) {
    return NextResponse.json({ error: 'email obrigatório' }, { status: 400 });
  }

  const email = body.email.toLowerCase().trim();

  // Sempre retornar sucesso para não revelar se o e-mail existe
  const successResponse = NextResponse.json(
    { ok: true, message: 'Se o e-mail existir, enviaremos instruções.' },
    { headers: limit.headers }
  );

  try {
    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return successResponse;
    }

    // Gerar token único
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Deletar tokens antigos do mesmo usuário
    await prisma.verificationToken.deleteMany({
      where: { identifier: `reset:${email}` },
    });

    // Criar novo token
    await prisma.verificationToken.create({
      data: {
        identifier: `reset:${email}`,
        token,
        expires,
      },
    });

    // Gerar URL de reset
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset/confirm?token=${token}&email=${encodeURIComponent(email)}`;

    // Enviar e-mail
    const { html, text, subject } = await buildEmailFromTemplate('auth.reset_password', {
      userName: user.name ? ` ${user.name}` : '',
      resetUrl,
    });
    await sendEmail({
      to: email,
      subject,
      html,
      text,
    });

    return successResponse;
  } catch (error) {
    console.error('Erro ao processar reset de senha:', error);
    return successResponse; // Não revelar erro
  }
}
