import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { userIsAdmin } from '../../../../src/server/auth/rbac';
import { prisma } from '../../../../src/server/db/client';

// GET - Listar todas as inscrições
export async function GET() {
  try {
    const session = await getServerSession(buildAuthOptions('admin'));
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    
    const isAdmin = await userIsAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const subscriptions = await prisma.newsletterSubscription.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error('Error fetching newsletter subscriptions:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar inscrições.' },
      { status: 500 }
    );
  }
}
