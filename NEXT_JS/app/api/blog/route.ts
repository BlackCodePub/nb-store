/**
 * API: Blog Posts (Loja - público)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPublishedPosts, getPostBySlug } from '../../../src/server/content/blog-service';
import { defaultLocale, type Locale, locales } from '../../../src/i18n/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    // Pegar locale do cookie ou header
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    const locale: Locale = locales.includes(cookieLocale as Locale) 
      ? cookieLocale as Locale 
      : defaultLocale;
    
    if (slug) {
      // Buscar post específico
      const post = await getPostBySlug(slug, locale);
      
      if (!post || !post.isPublished) {
        return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
      }
      
      return NextResponse.json(post);
    }
    
    // Listar posts
    const result = await getPublishedPosts(locale, page, limit);
    
    return NextResponse.json({
      posts: result.posts,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('[API /blog] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar posts' },
      { status: 500 }
    );
  }
}
