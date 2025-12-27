import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { userIsAdmin, userHasPermission } from '../../../../src/server/auth/rbac';
import { prisma } from '../../../../src/server/db/client';

const DEFAULT_LOCALE = 'pt-BR';

export async function GET(request: NextRequest) {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canView = isAdmin || await userHasPermission(session.user.id, 'content:read');
  if (!canView) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const isPublishedParam = searchParams.get('isPublished');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  // Where para o Post (isPublished está no Post)
  const where: {
    isPublished?: boolean;
    translations?: { some: { title: { contains: string } } };
  } = {};

  if (isPublishedParam === 'true') {
    where.isPublished = true;
  } else if (isPublishedParam === 'false') {
    where.isPublished = false;
  }

  // Search nas traduções
  if (search) {
    where.translations = { some: { title: { contains: search } } };
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        translations: true,
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({
    posts: posts.map(p => {
      const defaultTranslation = p.translations.find(t => t.locale === DEFAULT_LOCALE) || p.translations[0];
      return {
        id: p.id,
        slug: p.slug,
        isPublished: p.isPublished,
        publishedAt: p.publishedAt,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        title: defaultTranslation?.title || '',
        content: defaultTranslation?.content || '',
        excerpt: defaultTranslation?.excerpt || '',
        translations: p.translations,
        _count: { comments: p._count.comments },
      };
    }),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canCreate = isAdmin || await userHasPermission(session.user.id, 'content:write');
  if (!canCreate) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, slug, content, excerpt, isPublished, locale = DEFAULT_LOCALE } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Título e conteúdo são obrigatórios' }, { status: 400 });
    }

    // Gerar slug se não fornecido
    const finalSlug = slug || title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Verificar se slug já existe
    const existing = await prisma.post.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      return NextResponse.json({ error: 'Já existe um post com este slug' }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        slug: finalSlug,
        isPublished: isPublished ?? false,
        publishedAt: isPublished ? new Date() : null,
        translations: {
          create: {
            locale,
            title,
            content,
            excerpt: excerpt || null,
          },
        },
      },
      include: {
        translations: true,
        _count: { select: { comments: true } },
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar post:', error);
    return NextResponse.json({ error: 'Erro ao criar post' }, { status: 500 });
  }
}
