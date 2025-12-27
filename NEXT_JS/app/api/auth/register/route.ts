import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from '../../../../src/server/db/client';
import { isStrongPassword } from '../../../../src/server/auth/options';
import { rateLimitByRequest } from '../../../../src/server/utils/rate-limit';
import { sendEmail, generateEmailVerificationEmail } from '../../../../src/server/utils/email';

export async function POST(req: Request) {
  const limit = await rateLimitByRequest(req, { prefix: 'auth:register:', limit: 5, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'muitas tentativas, tente mais tarde' }, { status: 429, headers: limit.headers });
  }

  const body = await req.json().catch(() => null);
  const email = body?.email as string | undefined;
  const password = body?.password as string | undefined;
  const name = (body?.name as string | undefined) ?? null;

  if (!email || !password) {
    return NextResponse.json({ error: 'email e senha são obrigatórios' }, { status: 400 });
  }
  if (!isStrongPassword(password)) {
    return NextResponse.json({ error: 'senha fraca (mínimo 6 caracteres)' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: 'email já cadastrado' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  
  // Criar usuário
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name,
      passwordHash,
      emailVerified: null, // Aguardando verificação
    },
  });

  // Gerar token de verificação
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

  await prisma.verificationToken.create({
    data: {
      identifier: `verify:${normalizedEmail}`,
      token,
      expires,
    },
  });

  // Enviar e-mail de verificação
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

  const { html, text } = generateEmailVerificationEmail(verifyUrl, name || undefined);
  await sendEmail({
    to: normalizedEmail,
    subject: 'Confirme seu e-mail - nb-store',
    html,
    text,
  });

  return NextResponse.json({ 
    ok: true, 
    message: 'Cadastro realizado! Verifique seu e-mail para confirmar a conta.',
    requiresVerification: true,
  }, { headers: limit.headers });
}
