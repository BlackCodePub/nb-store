import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../src/server/auth/options';
import { userIsAdmin, userHasPermission } from '../../../../../src/server/auth/rbac';
import { prisma } from '../../../../../src/server/db/client';
import { logAdminAction } from '../../../../../src/server/utils/audit-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canModerate = isAdmin || await userHasPermission(session.user.id, 'content:moderate');
  if (!canModerate) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { status } = body;

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: { status },
      include: {
        post: { 
          select: { 
            id: true, 
            slug: true,
            translations: { select: { title: true }, take: 1 },
          },
        },
        user: { select: { name: true, email: true } },
      },
    });

    logAdminAction('admin.comment_moderated', session.user.id, id, 'comment', { status });

    return NextResponse.json({
      comment: {
        ...comment,
        post: {
          id: comment.post.id,
          slug: comment.post.slug,
          title: comment.post.translations[0]?.title || comment.post.slug,
        },
        author: comment.user,
      },
    });
  } catch (error) {
    console.error('Erro ao atualizar comentário:', error);
    return NextResponse.json({ error: 'Erro ao atualizar comentário' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canDelete = isAdmin || await userHasPermission(session.user.id, 'content:delete');
  if (!canDelete) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    await prisma.comment.delete({ where: { id } });
    logAdminAction('admin.comment_moderated', session.user.id, id, 'comment', { action: 'deleted' });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir comentário:', error);
    return NextResponse.json({ error: 'Erro ao excluir comentário' }, { status: 500 });
  }
}
