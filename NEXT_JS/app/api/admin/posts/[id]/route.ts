import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../src/server/auth/options';
import { userIsAdmin, userHasPermission } from '../../../../../src/server/auth/rbac';
import { prisma } from '../../../../../src/server/db/client';

const DEFAULT_LOCALE = 'pt-BR';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canView = isAdmin || await userHasPermission(session.user.id, 'content:read');
  if (!canView) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      translations: true,
      comments: {
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!post) {
    return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
  }

  const defaultTranslation = post.translations.find(t => t.locale === DEFAULT_LOCALE) || post.translations[0];
  return NextResponse.json({
    post: {
      ...post,
      title: defaultTranslation?.title || '',
      content: defaultTranslation?.content || '',
      excerpt: defaultTranslation?.excerpt || '',
    }
  });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canEdit = isAdmin || await userHasPermission(session.user.id, 'content:write');
  if (!canEdit) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, slug, content, excerpt, isPublished, locale = DEFAULT_LOCALE } = body;

    // Verificar se o novo slug já existe em outro post
    if (slug) {
      const existing = await prisma.post.findFirst({
        where: {
          slug,
          id: { not: id },
        },
      });
      if (existing) {
        return NextResponse.json({ error: 'Já existe um post com este slug' }, { status: 400 });
      }
    }

    // Atualizar post e tradução em transação
    const post = await prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id },
        data: {
          slug: slug || undefined,
          isPublished: isPublished ?? undefined,
          publishedAt: isPublished ? new Date() : undefined,
        },
      });

      // Upsert da tradução
      await tx.postTranslation.upsert({
        where: { postId_locale: { postId: id, locale } },
        create: {
          postId: id,
          locale,
          title: title || '',
          content: content || '',
          excerpt: excerpt || null,
        },
        update: {
          title: title || undefined,
          content: content || undefined,
          excerpt: excerpt ?? undefined,
        },
      });

      return tx.post.findUnique({
        where: { id },
        include: { translations: true },
      });
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Erro ao atualizar post:', error);
    return NextResponse.json({ error: 'Erro ao atualizar post' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canEdit = isAdmin || await userHasPermission(session.user.id, 'content:write');
  if (!canEdit) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { isPublished, publishedAt, slug } = body;

    const post = await prisma.post.update({
      where: { id },
      data: {
        isPublished,
        publishedAt: isPublished ? (publishedAt ?? new Date()) : null,
        slug: slug || undefined,
      },
      include: { translations: true },
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Erro ao atualizar post:', error);
    return NextResponse.json({ error: 'Erro ao atualizar post' }, { status: 500 });
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
    // Cascade delete cuida de translations e comments
    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir post:', error);
    return NextResponse.json({ error: 'Erro ao excluir post' }, { status: 500 });
  }
}