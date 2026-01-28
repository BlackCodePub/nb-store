import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { userHasPermission, userIsAdmin } from '../../../../src/server/auth/rbac';
import { prisma } from '../../../../src/server/db/client';

// GET - Listar templates de e-mail
export async function GET() {
  try {
    const session = await getServerSession(buildAuthOptions('store'));
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const isAdmin = await userIsAdmin(session.user.id);
    const hasAdminPermission = await userHasPermission(session.user.id, 'admin:full');
    if (!isAdmin && !hasAdminPermission) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const templates = await prisma.emailTemplate.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json({ error: 'Erro ao buscar templates.' }, { status: 500 });
  }
}
