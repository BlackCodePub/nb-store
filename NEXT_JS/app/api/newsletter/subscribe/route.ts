import { NextResponse } from 'next/server';
import { prisma } from '../../../../src/server/db/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'E-mail inválido.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verificar se já existe
    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.active) {
        return NextResponse.json(
          { error: 'Este e-mail já está inscrito na newsletter.' },
          { status: 400 }
        );
      } else {
        // Reativar inscrição
        await prisma.newsletterSubscription.update({
          where: { email: normalizedEmail },
          data: { active: true },
        });
        return NextResponse.json({ message: 'Inscrição reativada com sucesso!' });
      }
    }

    // Criar nova inscrição
    await prisma.newsletterSubscription.create({
      data: {
        email: normalizedEmail,
        active: true,
      },
    });

    return NextResponse.json({ message: 'Inscrição realizada com sucesso!' });
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
