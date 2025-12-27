/**
 * API: Blog Comments
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { addComment } from '../../../../src/server/content/blog-service';
import { prisma } from '../../../../src/server/db/client';

// POST: Adicionar comentário
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(buildAuthOptions('store'));
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const { postId, content } = await request.json();
    
    if (!postId || !content) {
      return NextResponse.json(
        { error: 'postId e content são obrigatórios' },
        { status: 400 }
      );
    }
    
    if (content.length < 3 || content.length > 2000) {
      return NextResponse.json(
        { error: 'Comentário deve ter entre 3 e 2000 caracteres' },
        { status: 400 }
      );
    }
    
    // Verificar se post existe e está publicado
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || !post.isPublished) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
    }
    
    const commentId = await addComment(postId, session.user.id, content);
    
    return NextResponse.json({
      success: true,
      commentId,
      message: 'Comentário enviado! Aguardando moderação.',
    });
  } catch (error) {
    console.error('[API /blog/comments] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao adicionar comentário' },
      { status: 500 }
    );
  }
}
