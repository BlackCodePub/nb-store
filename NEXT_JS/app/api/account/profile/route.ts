import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { prisma } from '../../../../src/server/db/client';

// GET - Retorna perfil do usuário
export async function GET() {
  // Debug: listar cookies recebidos
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  console.log('[DEBUG] Cookies recebidos:', allCookies.map(c => c.name));
  
  const session = await getServerSession(buildAuthOptions('store'));
  console.log('[DEBUG] Session:', session);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phone: true,
      cpf: true,
      birthDate: true,
      locale: true,
      currency: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    ...user,
    birthDate: user.birthDate ? user.birthDate.toISOString().split('T')[0] : '',
  });
}

// PUT - Atualiza perfil do usuário
export async function PUT(req: Request) {
  const session = await getServerSession(buildAuthOptions('store'));

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const { name, phone, cpf, birthDate, locale, currency } = body;

  // Validações básicas
  if (!name || name.trim().length < 2) {
    return NextResponse.json({ error: 'Nome deve ter pelo menos 2 caracteres' }, { status: 400 });
  }

  // Validar locale e currency
  const validLocales = ['pt-BR', 'en-US'];
  const validCurrencies = ['BRL', 'USD'];
  
  if (locale && !validLocales.includes(locale)) {
    return NextResponse.json({ error: 'Idioma inválido' }, { status: 400 });
  }
  
  if (currency && !validCurrencies.includes(currency)) {
    return NextResponse.json({ error: 'Moeda inválida' }, { status: 400 });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        cpf: cpf?.trim() || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        ...(locale && { locale }),
        ...(currency && { currency }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        birthDate: true,
        locale: true,
        currency: true,
      },
    });

    return NextResponse.json({
      ...updatedUser,
      birthDate: updatedUser.birthDate ? updatedUser.birthDate.toISOString().split('T')[0] : '',
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
  }
}
