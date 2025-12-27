import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { userIsAdmin, userHasPermission } from '../../../../src/server/auth/rbac';
import { prisma } from '../../../../src/server/db/client';

export async function GET(request: NextRequest) {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  const canView = isAdmin || await userHasPermission(session.user.id, 'content:moderate');
  if (!canView) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';
  const postId = searchParams.get('postId') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const where: {
    status?: string;
    postId?: string;
  } = {};

  if (status) {
    where.status = status;
  }

  if (postId) {
    where.postId = postId;
  }

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      include: {
        post: { 
          select: { 
            id: true, 
            slug: true, 
            translations: { 
              select: { title: true, locale: true },
              take: 1,
            },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.comment.count({ where }),
  ]);

  return NextResponse.json({
    comments: comments.map(c => ({
      ...c,
      post: {
        id: c.post.id,
        slug: c.post.slug,
        title: c.post.translations[0]?.title || c.post.slug,
      },
      author: c.user,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
