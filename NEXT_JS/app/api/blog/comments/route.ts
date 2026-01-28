/**
 * API: Blog Comments
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { addComment } from '../../../../src/server/content/blog-service';
import { prisma } from '../../../../src/server/db/client';
import { rateLimitByRequest } from '../../../../src/server/utils/rate-limit';
import { logSecurityEvent } from '../../../../src/server/utils/audit-logger';

// POST: Adicionar comentário
export async function POST(request: NextRequest) {
  try {
    const limit = await rateLimitByRequest(request, { prefix: 'comment:create:', limit: 5, windowMs: 60_000 });
    if (!limit.allowed) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      logSecurityEvent('security.rate_limited', ip, { scope: 'comment:create' });
      return NextResponse.json({ error: 'muitas tentativas, tente mais tarde' }, { status: 429, headers: limit.headers });
    }

    const session = await getServerSession(buildAuthOptions('store'));
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401, headers: limit.headers });
    }
    
    const { postId, content } = await request.json();
    
    if (!postId || !content) {
      return NextResponse.json(
        { error: 'postId e content são obrigatórios' },
        { status: 400, headers: limit.headers }
      );
    }
    
    if (content.length < 3 || content.length > 2000) {
      return NextResponse.json(
        { error: 'Comentário deve ter entre 3 e 2000 caracteres' },
        { status: 400, headers: limit.headers }
      );
    }
    
    // Verificar se post existe e está publicado
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || !post.isPublished) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404, headers: limit.headers });
    }
    
    const commentId = await addComment(postId, session.user.id, content);
    
    return NextResponse.json({
      success: true,
      commentId,
      message: 'Comentário enviado! Aguardando moderação.',
    }, { headers: limit.headers });
  } catch (error) {
    console.error('[API /blog/comments] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao adicionar comentário' },
      { status: 500 }
    );
  }
}
