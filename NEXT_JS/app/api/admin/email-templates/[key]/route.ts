import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../src/server/auth/options';
import { userHasPermission, userIsAdmin } from '../../../../../src/server/auth/rbac';
import { prisma } from '../../../../../src/server/db/client';

interface RouteParams {
  params: Promise<{ key: string }>;
}

// GET - Buscar template por key
export async function GET(_request: Request, { params }: RouteParams) {
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

    const { key } = await params;
    const template = await prisma.emailTemplate.findUnique({ where: { key } });

    if (!template) {
      return NextResponse.json({ error: 'Template não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching email template:', error);
    return NextResponse.json({ error: 'Erro ao buscar template.' }, { status: 500 });
  }
}

// PUT - Criar/atualizar template
export async function PUT(request: Request, { params }: RouteParams) {
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

    const { key } = await params;
    const body = await request.json();
    const { name, audience, subject, html, text } = body;

    if (!subject || !html || !text) {
      return NextResponse.json(
        { error: 'Assunto, HTML e texto são obrigatórios.' },
        { status: 400 }
      );
    }

    const template = await prisma.emailTemplate.upsert({
      where: { key },
      update: {
        name: name || key,
        audience: audience || null,
        subject,
        html,
        text,
      },
      create: {
        key,
        name: name || key,
        audience: audience || null,
        subject,
        html,
        text,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error saving email template:', error);
    return NextResponse.json({ error: 'Erro ao salvar template.' }, { status: 500 });
  }
}

// DELETE - Remover override (voltar ao padrão)
export async function DELETE(_request: Request, { params }: RouteParams) {
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

    const { key } = await params;
    await prisma.emailTemplate.delete({ where: { key } });

    return NextResponse.json({ message: 'Template removido.' });
  } catch (error) {
    console.error('Error deleting email template:', error);
    return NextResponse.json({ error: 'Erro ao remover template.' }, { status: 500 });
  }
}
