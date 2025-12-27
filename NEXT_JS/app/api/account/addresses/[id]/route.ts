import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../src/server/auth/options';
import { prisma } from '../../../../../src/server/db/client';

// PUT - Atualizar endereço
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(buildAuthOptions('store'));

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  // Verificar se o endereço pertence ao usuário
  const existingAddress = await prisma.userAddress.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existingAddress) {
    return NextResponse.json({ error: 'Endereço não encontrado' }, { status: 404 });
  }

  const { name, phone, zipCode, street, number, complement, neighborhood, city, state, isDefault } = body;

  // Validações
  if (!name || !phone || !zipCode || !street || !number || !neighborhood || !city || !state) {
    return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
  }

  // Se o endereço será o padrão, remover flag dos outros
  if (isDefault && !existingAddress.isDefault) {
    await prisma.userAddress.updateMany({
      where: { userId: session.user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const updatedAddress = await prisma.userAddress.update({
    where: { id },
    data: {
      name: name.trim(),
      phone: phone.trim(),
      zipCode: zipCode.replace(/\D/g, ''),
      street: street.trim(),
      number: number.trim(),
      complement: complement?.trim() || null,
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state.toUpperCase().trim(),
      isDefault: isDefault ?? existingAddress.isDefault,
    },
  });

  return NextResponse.json({
    id: updatedAddress.id,
    name: updatedAddress.name,
    phone: updatedAddress.phone || '',
    zipCode: updatedAddress.zipCode,
    street: updatedAddress.street,
    number: updatedAddress.number,
    complement: updatedAddress.complement || '',
    neighborhood: updatedAddress.neighborhood,
    city: updatedAddress.city,
    state: updatedAddress.state,
    isDefault: updatedAddress.isDefault,
  });
}

// DELETE - Excluir endereço
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(buildAuthOptions('store'));

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;

  // Verificar se o endereço pertence ao usuário
  const existingAddress = await prisma.userAddress.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existingAddress) {
    return NextResponse.json({ error: 'Endereço não encontrado' }, { status: 404 });
  }

  const wasDefault = existingAddress.isDefault;

  await prisma.userAddress.delete({
    where: { id },
  });

  // Se era o endereço padrão, definir outro como padrão
  if (wasDefault) {
    const anotherAddress = await prisma.userAddress.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (anotherAddress) {
      await prisma.userAddress.update({
        where: { id: anotherAddress.id },
        data: { isDefault: true },
      });
    }
  }

  return NextResponse.json({ ok: true, message: 'Endereço excluído' });
}
