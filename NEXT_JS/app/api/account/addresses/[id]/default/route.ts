import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../../src/server/auth/options';
import { prisma } from '../../../../../../src/server/db/client';

// PUT - Definir endereço como padrão
export async function PUT(
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

  // Remover flag de padrão de todos os endereços do usuário
  await prisma.userAddress.updateMany({
    where: { userId: session.user.id, isDefault: true },
    data: { isDefault: false },
  });

  // Definir o endereço selecionado como padrão
  await prisma.userAddress.update({
    where: { id },
    data: { isDefault: true },
  });

  return NextResponse.json({ ok: true, message: 'Endereço padrão atualizado' });
}
