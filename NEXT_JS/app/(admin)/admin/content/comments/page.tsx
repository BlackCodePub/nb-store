'use client';

import { useState, useEffect } from 'react';

interface Comment {
  id: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  postId: string;
  post?: {
    title: string;
    slug: string;
  };
  userId: string;
  user?: {
    name: string | null;
    email: string;
  };
  createdAt: string;
}

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    fetchComments();
  }, [statusFilter, page]);
  
  const fetchComments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (statusFilter) params.append('status', statusFilter);
      
      const res = await fetch(`/api/admin/comments?${params}`);
      const data = await res.json();
      setComments(data.comments || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleModerate = async (comment: Comment, action: 'approved' | 'rejected') => {
    try {
      await fetch(`/api/admin/comments/${comment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      fetchComments();
    } catch (error) {
      console.error('Erro ao moderar comentário:', error);
    }
  };
  
  const handleDelete = async (comment: Comment) => {
    if (!confirm('Tem certeza que deseja excluir este comentário?')) return;
    
    try {
      await fetch(`/api/admin/comments/${comment.id}`, { method: 'DELETE' });
      fetchComments();
    } catch (error) {
      console.error('Erro ao excluir comentário:', error);
    }
  };
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };
  
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'bg-warning text-dark', text: 'Pendente' },
      approved: { bg: 'bg-success', text: 'Aprovado' },
      rejected: { bg: 'bg-danger', text: 'Rejeitado' },
    };
    return badges[status] || badges.pending;
  };
  
  // Contadores
  const pendingCount = comments.filter(c => c.status === 'pending').length;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">
          Comentários
          {statusFilter === 'pending' && pendingCount > 0 && (
            <span className="badge bg-warning text-dark ms-2">{pendingCount} pendentes</span>
          )}
        </h1>
      </div>
      
      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="btn-group">
            <button
              className={`btn ${statusFilter === 'pending' ? 'btn-warning' : 'btn-outline-secondary'}`}
              onClick={() => { setStatusFilter('pending'); setPage(1); }}
            >
              <i className="bi bi-clock me-1"></i>
              Pendentes
            </button>
            <button
              className={`btn ${statusFilter === 'approved' ? 'btn-success' : 'btn-outline-secondary'}`}
              onClick={() => { setStatusFilter('approved'); setPage(1); }}
            >
              <i className="bi bi-check-lg me-1"></i>
              Aprovados
            </button>
            <button
              className={`btn ${statusFilter === 'rejected' ? 'btn-danger' : 'btn-outline-secondary'}`}
              onClick={() => { setStatusFilter('rejected'); setPage(1); }}
            >
              <i className="bi bi-x-lg me-1"></i>
              Rejeitados
            </button>
            <button
              className={`btn ${statusFilter === '' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => { setStatusFilter(''); setPage(1); }}
            >
              Todos
            </button>
          </div>
        </div>
      </div>
      
      {/* Lista de Comentários */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border"></div>
          <p className="mt-2 text-muted">Carregando comentários...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5 text-muted">
            <i className="bi bi-chat-dots fs-1"></i>
            <p className="mt-2">Nenhum comentário encontrado</p>
          </div>
        </div>
      ) : (
        <div className="row">
          {comments.map((comment) => (
            <div key={comment.id} className="col-12 mb-3">
              <div className={`card ${comment.status === 'pending' ? 'border-warning' : ''}`}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <strong>{comment.user?.name || comment.user?.email || 'Anônimo'}</strong>
                      <span className="text-muted ms-2">em</span>
                      <a href={`/blog/${comment.post?.slug}`} className="ms-1" target="_blank">
                        {comment.post?.title || 'Post não encontrado'}
                      </a>
                    </div>
                    <div>
                      <span className={`badge ${getStatusBadge(comment.status).bg}`}>
                        {getStatusBadge(comment.status).text}
                      </span>
                    </div>
                  </div>
                  
                  <p className="mb-2">{comment.content}</p>
                  
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      {formatDate(comment.createdAt)}
                    </small>
                    
                    <div className="btn-group btn-group-sm">
                      {comment.status === 'pending' && (
                        <>
                          <button
                            className="btn btn-success"
                            onClick={() => handleModerate(comment, 'approved')}
                            title="Aprovar"
                          >
                            <i className="bi bi-check-lg me-1"></i>
                            Aprovar
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleModerate(comment, 'rejected')}
                            title="Rejeitar"
                          >
                            <i className="bi bi-x-lg me-1"></i>
                            Rejeitar
                          </button>
                        </>
                      )}
                      {comment.status === 'approved' && (
                        <button
                          className="btn btn-outline-warning"
                          onClick={() => handleModerate(comment, 'rejected')}
                          title="Rejeitar"
                        >
                          <i className="bi bi-x-lg me-1"></i>
                          Rejeitar
                        </button>
                      )}
                      {comment.status === 'rejected' && (
                        <button
                          className="btn btn-outline-success"
                          onClick={() => handleModerate(comment, 'approved')}
                          title="Aprovar"
                        >
                          <i className="bi bi-check-lg me-1"></i>
                          Aprovar
                        </button>
                      )}
                      <button
                        className="btn btn-outline-danger"
                        onClick={() => handleDelete(comment)}
                        title="Excluir"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Paginação */}
      {totalPages > 1 && (
        <nav className="mt-4">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage(p => Math.max(1, p - 1))}>
                Anterior
              </button>
            </li>
            <li className="page-item disabled">
              <span className="page-link">
                Página {page} de {totalPages}
              </span>
            </li>
            <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                Próxima
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
