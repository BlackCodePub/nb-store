import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../src/server/auth/options';
import { userIsAdmin } from '../../../../../src/server/auth/rbac';
import { prisma } from '../../../../../src/server/db/client';

// PUT - Atualizar inscrição (ativar/desativar)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(buildAuthOptions('admin'));
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    
    const isAdmin = await userIsAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { active } = body;

    const subscription = await prisma.newsletterSubscription.update({
      where: { id },
      data: { active },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error updating newsletter subscription:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar inscrição.' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir inscrição
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(buildAuthOptions('admin'));
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    
    const isAdmin = await userIsAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.newsletterSubscription.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Inscrição excluída com sucesso.' });
  } catch (error) {
    console.error('Error deleting newsletter subscription:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir inscrição.' },
      { status: 500 }
    );
  }
}
