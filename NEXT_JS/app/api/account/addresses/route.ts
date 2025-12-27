import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { prisma } from '../../../../src/server/db/client';

// GET - Lista endereços do usuário
export async function GET() {
  const session = await getServerSession(buildAuthOptions('store'));

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const addresses = await prisma.userAddress.findMany({
    where: { userId: session.user.id },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      name: true,
      phone: true,
      zipCode: true,
      street: true,
      number: true,
      complement: true,
      neighborhood: true,
      city: true,
      state: true,
      isDefault: true,
    },
  });

  return NextResponse.json(addresses.map(addr => ({
    ...addr,
    complement: addr.complement || '',
    phone: addr.phone || '',
  })));
}

// POST - Salva novo endereço
export async function POST(req: Request) {
  const session = await getServerSession(buildAuthOptions('store'));

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const { name, phone, zipCode, street, number, complement, neighborhood, city, state, isDefault } = body;

  // Validações
  if (!name || !phone || !zipCode || !street || !number || !neighborhood || !city || !state) {
    return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
  }

  // Se o novo endereço será o padrão, remover flag dos outros
  if (isDefault) {
    await prisma.userAddress.updateMany({
      where: { userId: session.user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  // Verificar se é o primeiro endereço (deve ser padrão)
  const addressCount = await prisma.userAddress.count({
    where: { userId: session.user.id },
  });

  const newAddress = await prisma.userAddress.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      phone: phone.trim(),
      zipCode: zipCode.replace(/\D/g, ''),
      street: street.trim(),
      number: number.trim(),
      complement: complement?.trim() || null,
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state.toUpperCase().trim(),
      isDefault: isDefault || addressCount === 0,
    },
  });

  return NextResponse.json({
    id: newAddress.id,
    name: newAddress.name,
    phone: newAddress.phone || '',
    zipCode: newAddress.zipCode,
    street: newAddress.street,
    number: newAddress.number,
    complement: newAddress.complement || '',
    neighborhood: newAddress.neighborhood,
    city: newAddress.city,
    state: newAddress.state,
    isDefault: newAddress.isDefault,
  });
}
