import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { rateLimitByRequest } from '../../../../src/server/utils/rate-limit';
import { prisma } from '../../../../src/server/db/client';
import { sendEmail, buildEmailFromTemplate } from '../../../../src/server/utils/email';

export async function POST(req: Request) {
  const limit = await rateLimitByRequest(req, { prefix: 'auth:resend:', limit: 3, windowMs: 60_000 });
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
    { ok: true, message: 'Se o e-mail existir e não estiver verificado, enviaremos um novo link.' },
    { headers: limit.headers }
  );

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || user.emailVerified) {
      return successResponse;
    }

    // Deletar tokens antigos
    await prisma.verificationToken.deleteMany({
      where: { identifier: `verify:${email}` },
    });

    // Gerar novo token
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    await prisma.verificationToken.create({
      data: {
        identifier: `verify:${email}`,
        token,
        expires,
      },
    });

    // Enviar e-mail
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    const { html, text, subject } = await buildEmailFromTemplate('auth.verify_email', {
      userName: user.name ? ` ${user.name}` : '',
      verifyUrl,
    });
    await sendEmail({
      to: email,
      subject,
      html,
      text,
    });

    return successResponse;
  } catch (error) {
    console.error('Erro ao reenviar verificação:', error);
    return successResponse;
  }
}
