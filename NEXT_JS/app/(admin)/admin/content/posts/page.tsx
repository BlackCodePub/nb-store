'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  isPublished: boolean;
  _count?: {
    comments: number;
  };
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  
  useEffect(() => {
    fetchPosts();
  }, [statusFilter]);
  
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('isPublished', statusFilter);
      
      const res = await fetch(`/api/admin/posts?${params}`);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Erro ao carregar posts:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleStatus = async (post: Post) => {
    const newIsPublished = !post.isPublished;
    
    try {
      await fetch(`/api/admin/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isPublished: newIsPublished,
          publishedAt: newIsPublished ? new Date().toISOString() : null,
        }),
      });
      fetchPosts();
    } catch (error) {
      console.error('Erro ao atualizar post:', error);
    }
  };
  
  const handleDelete = async (post: Post) => {
    if (!confirm(`Tem certeza que deseja excluir "${post.title}"?`)) return;
    
    try {
      await fetch(`/api/admin/posts/${post.id}`, { method: 'DELETE' });
      fetchPosts();
    } catch (error) {
      console.error('Erro ao excluir post:', error);
    }
  };
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Blog - Posts</h1>
        <Link href="/admin/content/posts/new" className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i>
          Novo Post
        </Link>
      </div>
      
      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos os status</option>
                <option value="true">Publicados</option>
                <option value="false">Rascunhos</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Lista de Posts */}
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Título</th>
                <th>Status</th>
                <th>Comentários</th>
                <th>Data</th>
                <th style={{width: '150px'}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-4">
                    <div className="spinner-border spinner-border-sm me-2"></div>
                    Carregando...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    Nenhum post encontrado
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <div className="fw-medium">{post.title}</div>
                      <small className="text-muted">/blog/{post.slug}</small>
                    </td>
                    <td>
                      <span className={`badge ${post.isPublished ? 'bg-success' : 'bg-secondary'}`}>
                        {post.isPublished ? 'Publicado' : 'Rascunho'}
                      </span>
                    </td>
                    <td>
                      <Link href={`/admin/content/comments?postId=${post.id}`} className="text-decoration-none">
                        {post._count?.comments || 0}
                        <i className="bi bi-chat-dots ms-1"></i>
                      </Link>
                    </td>
                    <td>
                      {post.publishedAt 
                        ? formatDate(post.publishedAt)
                        : <span className="text-muted">{formatDate(post.createdAt)}</span>
                      }
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <Link 
                          href={`/admin/content/posts/${post.id}`}
                          className="btn btn-outline-primary"
                          title="Editar"
                        >
                          <i className="bi bi-pencil"></i>
                        </Link>
                        <button 
                          className={`btn ${post.isPublished ? 'btn-outline-warning' : 'btn-outline-success'}`}
                          onClick={() => handleToggleStatus(post)}
                          title={post.isPublished ? 'Despublicar' : 'Publicar'}
                        >
                          <i className={`bi ${post.isPublished ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                        </button>
                        <button 
                          className="btn btn-outline-danger"
                          onClick={() => handleDelete(post)}
                          title="Excluir"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
