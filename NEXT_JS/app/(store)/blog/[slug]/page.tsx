'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  publishedAt: string | null;
  comments: {
    id: string;
    content: string;
    createdAt: string;
    user: {
      name: string | null;
      image: string | null;
    };
  }[];
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session } = useSession();
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Comment form
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(false);
  
  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);
  
  const fetchPost = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/blog?slug=${slug}`);
      if (!res.ok) {
        setError('Post não encontrado');
        return;
      }
      const data = await res.json();
      setPost(data);
    } catch (err) {
      setError('Erro ao carregar post');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !post) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/blog/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          content: comment,
        }),
      });
      
      if (res.ok) {
        setComment('');
        setCommentSuccess(true);
        setTimeout(() => setCommentSuccess(false), 5000);
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }
  
  if (error || !post) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error || 'Post não encontrado'}
        </div>
        <Link href="/blog" className="btn btn-outline-primary">
          <i className="bi bi-arrow-left me-2"></i>
          Voltar ao Blog
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container py-4">
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/">Início</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href="/blog">Blog</Link>
          </li>
          <li className="breadcrumb-item active">{post.title}</li>
        </ol>
      </nav>
      
      <article>
        <header className="mb-4">
          <h1>{post.title}</h1>
          {post.publishedAt && (
            <p className="text-muted">
              <i className="bi bi-calendar me-2"></i>
              Publicado em {new Date(post.publishedAt).toLocaleDateString('pt-BR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </header>
        
        <div 
          className="post-content mb-5"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
      
      <hr className="my-5" />
      
      {/* Comentários */}
      <section>
        <h3 className="mb-4">
          <i className="bi bi-chat-dots me-2"></i>
          Comentários ({post.comments.length})
        </h3>
        
        {post.comments.length === 0 ? (
          <p className="text-muted">Seja o primeiro a comentar!</p>
        ) : (
          <div className="mb-4">
            {post.comments.map((c) => (
              <div key={c.id} className="card mb-3">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-2">
                    {c.user.image ? (
                      <img 
                        src={c.user.image} 
                        alt="" 
                        className="rounded-circle me-2"
                        width={32}
                        height={32}
                      />
                    ) : (
                      <div 
                        className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-2"
                        style={{ width: 32, height: 32 }}
                      >
                        <i className="bi bi-person text-white"></i>
                      </div>
                    )}
                    <div>
                      <strong>{c.user.name || 'Anônimo'}</strong>
                      <small className="text-muted ms-2">
                        {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                      </small>
                    </div>
                  </div>
                  <p className="mb-0">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Formulário de comentário */}
        {session?.user ? (
          <div className="card">
            <div className="card-header">
              <i className="bi bi-pencil me-2"></i>
              Deixe seu comentário
            </div>
            <div className="card-body">
              {commentSuccess && (
                <div className="alert alert-success">
                  <i className="bi bi-check-circle me-2"></i>
                  Comentário enviado! Aguardando moderação.
                </div>
              )}
              
              <form onSubmit={handleSubmitComment}>
                <div className="mb-3">
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Escreva seu comentário..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    minLength={3}
                    maxLength={2000}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !comment.trim()}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2"></i>
                      Enviar Comentário
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2"></i>
            <Link href="/login">Faça login</Link> para deixar um comentário.
          </div>
        )}
      </section>
    </div>
  );
}
