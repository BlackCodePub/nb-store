/**
 * Blog Service
 * CRUD de posts e gerenciamento de comentários
 */

import { prisma } from '../db/client';
import type { Locale } from '../../i18n/config';

export interface PostInput {
  slug: string;
  isPublished?: boolean;
  translations: {
    locale: Locale;
    title: string;
    content: string;
    excerpt?: string;
    seoTitle?: string;
    seoDescription?: string;
  }[];
}

export interface PostListItem {
  id: string;
  slug: string;
  isPublished: boolean;
  publishedAt: Date | null;
  title: string;
  excerpt: string | null;
  createdAt: Date;
  commentCount: number;
}

export interface PostDetail {
  id: string;
  slug: string;
  isPublished: boolean;
  publishedAt: Date | null;
  title: string;
  content: string;
  excerpt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  comments: {
    id: string;
    content: string;
    status: string;
    createdAt: Date;
    user: {
      id: string;
      name: string | null;
      image: string | null;
    };
  }[];
}

/**
 * Lista posts publicados (para a loja)
 */
export async function getPublishedPosts(
  locale: Locale,
  page = 1,
  limit = 10
): Promise<{ posts: PostListItem[]; total: number }> {
  const skip = (page - 1) * limit;
  
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      skip,
      take: limit,
      include: {
        translations: {
          where: { locale },
        },
        _count: {
          select: { comments: { where: { status: 'approved' } } },
        },
      },
    }),
    prisma.post.count({ where: { isPublished: true } }),
  ]);
  
  return {
    posts: posts.map(post => {
      const translation = post.translations[0];
      return {
        id: post.id,
        slug: post.slug,
        isPublished: post.isPublished,
        publishedAt: post.publishedAt,
        title: translation?.title || 'Sem título',
        excerpt: translation?.excerpt || null,
        createdAt: post.createdAt,
        commentCount: post._count.comments,
      };
    }),
    total,
  };
}

/**
 * Busca post por slug
 */
export async function getPostBySlug(
  slug: string,
  locale: Locale
): Promise<PostDetail | null> {
  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      translations: {
        where: { locale },
      },
      comments: {
        where: { status: 'approved' },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
      },
    },
  });
  
  if (!post) return null;
  
  const translation = post.translations[0];
  
  return {
    id: post.id,
    slug: post.slug,
    isPublished: post.isPublished,
    publishedAt: post.publishedAt,
    title: translation?.title || 'Sem título',
    content: translation?.content || '',
    excerpt: translation?.excerpt || null,
    seoTitle: translation?.seoTitle || null,
    seoDescription: translation?.seoDescription || null,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    comments: post.comments.map(c => ({
      id: c.id,
      content: c.content,
      status: c.status,
      createdAt: c.createdAt,
      user: c.user,
    })),
  };
}

/**
 * Cria novo post (admin)
 */
export async function createPost(input: PostInput): Promise<string> {
  const post = await prisma.post.create({
    data: {
      slug: input.slug,
      isPublished: input.isPublished || false,
      publishedAt: input.isPublished ? new Date() : null,
      translations: {
        create: input.translations,
      },
    },
  });
  
  return post.id;
}

/**
 * Atualiza post (admin)
 */
export async function updatePost(id: string, input: Partial<PostInput>): Promise<void> {
  const data: Record<string, unknown> = {};
  
  if (input.slug) data.slug = input.slug;
  if (typeof input.isPublished === 'boolean') {
    data.isPublished = input.isPublished;
    if (input.isPublished) {
      // Se está publicando, definir data de publicação
      const post = await prisma.post.findUnique({ where: { id } });
      if (!post?.publishedAt) {
        data.publishedAt = new Date();
      }
    }
  }
  
  await prisma.post.update({
    where: { id },
    data,
  });
  
  // Atualizar traduções
  if (input.translations) {
    for (const translation of input.translations) {
      await prisma.postTranslation.upsert({
        where: {
          postId_locale: { postId: id, locale: translation.locale },
        },
        update: {
          title: translation.title,
          content: translation.content,
          excerpt: translation.excerpt,
          seoTitle: translation.seoTitle,
          seoDescription: translation.seoDescription,
        },
        create: {
          postId: id,
          locale: translation.locale,
          title: translation.title,
          content: translation.content,
          excerpt: translation.excerpt,
          seoTitle: translation.seoTitle,
          seoDescription: translation.seoDescription,
        },
      });
    }
  }
}

/**
 * Deleta post (admin)
 */
export async function deletePost(id: string): Promise<void> {
  await prisma.post.delete({ where: { id } });
}

/**
 * Lista todos os posts (admin)
 */
export async function getAllPosts(
  page = 1,
  limit = 20
): Promise<{ posts: PostListItem[]; total: number }> {
  const skip = (page - 1) * limit;
  
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        translations: true,
        _count: {
          select: { comments: true },
        },
      },
    }),
    prisma.post.count(),
  ]);
  
  return {
    posts: posts.map(post => {
      const translation = post.translations[0];
      return {
        id: post.id,
        slug: post.slug,
        isPublished: post.isPublished,
        publishedAt: post.publishedAt,
        title: translation?.title || 'Sem título',
        excerpt: translation?.excerpt || null,
        createdAt: post.createdAt,
        commentCount: post._count.comments,
      };
    }),
    total,
  };
}

// ==========================================
// Comentários
// ==========================================

/**
 * Adiciona comentário (usuário autenticado)
 */
export async function addComment(
  postId: string,
  userId: string,
  content: string
): Promise<string> {
  const comment = await prisma.comment.create({
    data: {
      postId,
      userId,
      content,
      status: 'pending', // Moderação
    },
  });
  
  return comment.id;
}

/**
 * Modera comentário (admin)
 */
export async function moderateComment(
  commentId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  await prisma.comment.update({
    where: { id: commentId },
    data: { status },
  });
}

/**
 * Deleta comentário (admin)
 */
export async function deleteComment(commentId: string): Promise<void> {
  await prisma.comment.delete({ where: { id: commentId } });
}

/**
 * Lista comentários pendentes (admin)
 */
export async function getPendingComments(): Promise<{
  id: string;
  content: string;
  createdAt: Date;
  post: { id: string; slug: string };
  user: { id: string; name: string | null; email: string };
}[]> {
  const comments = await prisma.comment.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'desc' },
    include: {
      post: { select: { id: true, slug: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
  
  return comments;
}
