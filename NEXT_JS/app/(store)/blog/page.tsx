'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  commentCount: number;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    fetchPosts();
  }, [page]);
  
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/blog?page=${page}&limit=10`);
      const data = await res.json();
      setPosts(data.posts || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container py-4">
      <h1 className="mb-4">
        <i className="bi bi-journal-text me-2"></i>
        Blog
      </h1>
      
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          Nenhum post publicado ainda.
        </div>
      ) : (
        <>
          <div className="row g-4">
            {posts.map((post) => (
              <div key={post.id} className="col-md-6 col-lg-4">
                <div className="card h-100">
                  <div className="card-body">
                    <h5 className="card-title">
                      <Link href={`/blog/${post.slug}`} className="text-decoration-none">
                        {post.title}
                      </Link>
                    </h5>
                    
                    {post.excerpt && (
                      <p className="card-text text-muted">
                        {post.excerpt.substring(0, 150)}
                        {post.excerpt.length > 150 && '...'}
                      </p>
                    )}
                  </div>
                  
                  <div className="card-footer bg-transparent d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      {post.publishedAt && new Date(post.publishedAt).toLocaleDateString('pt-BR')}
                    </small>
                    
                    <small className="text-muted">
                      <i className="bi bi-chat-dots me-1"></i>
                      {post.commentCount}
                    </small>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Paginação */}
          {totalPages > 1 && (
            <nav className="mt-4">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 1}
                  >
                    Anterior
                  </button>
                </li>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  </li>
                ))}
                
                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page === totalPages}
                  >
                    Próximo
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
