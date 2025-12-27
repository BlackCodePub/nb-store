'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface PostFormData {
  slug: string;
  isPublished: boolean;
  locale: string;
  title: string;
  content: string;
  excerpt: string;
  publishedAt: string;
}

const LOCALES = [
  { code: 'pt-BR', name: 'Português (BR)' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
];

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeLocale, setActiveLocale] = useState('pt-BR');
  
  const [formData, setFormData] = useState<PostFormData>({
    slug: '',
    isPublished: false,
    locale: 'pt-BR',
    title: '',
    content: '',
    excerpt: '',
    publishedAt: '',
  });
  
  // Traduções por locale
  const [translations, setTranslations] = useState<Record<string, { title: string; content: string; excerpt: string }>>({
    'pt-BR': { title: '', content: '', excerpt: '' },
    'en': { title: '', content: '', excerpt: '' },
    'es': { title: '', content: '', excerpt: '' },
  });

  const fetchPost = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/posts/${postId}`);
      if (!res.ok) throw new Error('Erro ao carregar post');
      
      const data = await res.json();
      const post = data.post;
      
      setFormData({
        slug: post.slug,
        isPublished: post.isPublished || false,
        locale: post.locale || 'pt-BR',
        title: post.title || '',
        content: post.content || '',
        excerpt: post.excerpt || '',
        publishedAt: post.publishedAt ? post.publishedAt.split('T')[0] : '',
      });
      
      // Se tiver traduções, carregar
      if (post.translations) {
        const newTranslations = { ...translations };
        for (const trans of post.translations) {
          newTranslations[trans.locale] = {
            title: trans.title || '',
            content: trans.content || '',
            excerpt: trans.excerpt || '',
          };
        }
        setTranslations(newTranslations);
      } else {
        // Usar dados do post no locale padrão
        setTranslations(prev => ({
          ...prev,
          [post.locale || 'pt-BR']: {
            title: post.title || '',
            content: post.content || '',
            excerpt: post.excerpt || '',
          },
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleTranslationChange = (locale: string, field: 'title' | 'content' | 'excerpt', value: string) => {
    setTranslations(prev => ({
      ...prev,
      [locale]: {
        ...prev[locale],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const currentTranslation = translations[activeLocale];
      
      const res = await fetch(`/api/admin/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: formData.slug,
          isPublished: formData.isPublished,
          locale: activeLocale,
          title: currentTranslation.title,
          content: currentTranslation.content,
          excerpt: currentTranslation.excerpt,
          publishedAt: formData.isPublished && formData.publishedAt 
            ? new Date(formData.publishedAt).toISOString() 
            : (formData.isPublished ? new Date().toISOString() : null),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar');
      }

      router.push('/admin/content/posts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPublished: true,
          publishedAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao publicar');
      }

      router.push('/admin/content/posts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao publicar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  const currentTranslation = translations[activeLocale];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link href="/admin/content/posts" className="text-decoration-none text-muted">
            <i className="bi bi-arrow-left me-2"></i>
            Voltar
          </Link>
          <h1 className="h3 mb-0 mt-2">Editar Post</h1>
        </div>
        <div className="d-flex gap-2">
          {!formData.isPublished && (
            <button
              type="button"
              className="btn btn-success"
              onClick={handlePublish}
              disabled={saving}
            >
              <i className="bi bi-check-lg me-2"></i>
              Publicar
            </button>
          )}
          <button
            type="submit"
            form="post-form"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Salvando...
              </>
            ) : (
              <>
                <i className="bi bi-save me-2"></i>
                Salvar
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      <form id="post-form" onSubmit={handleSubmit}>
        <div className="row">
          {/* Coluna principal */}
          <div className="col-lg-8">
            {/* Seletor de idioma */}
            <div className="card mb-4">
              <div className="card-header">
                <ul className="nav nav-tabs card-header-tabs">
                  {LOCALES.map((locale) => (
                    <li className="nav-item" key={locale.code}>
                      <button
                        type="button"
                        className={`nav-link ${activeLocale === locale.code ? 'active' : ''}`}
                        onClick={() => setActiveLocale(locale.code)}
                      >
                        {locale.name}
                        {translations[locale.code]?.title && (
                          <i className="bi bi-check-circle-fill text-success ms-2"></i>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Título *</label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    value={currentTranslation.title}
                    onChange={(e) => handleTranslationChange(activeLocale, 'title', e.target.value)}
                    placeholder={`Título em ${LOCALES.find(l => l.code === activeLocale)?.name}`}
                    required={activeLocale === 'pt-BR'}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Resumo</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={currentTranslation.excerpt}
                    onChange={(e) => handleTranslationChange(activeLocale, 'excerpt', e.target.value)}
                    placeholder="Breve descrição do post (aparece na listagem)"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Conteúdo *</label>
                  <textarea
                    className="form-control"
                    rows={15}
                    value={currentTranslation.content}
                    onChange={(e) => handleTranslationChange(activeLocale, 'content', e.target.value)}
                    placeholder="Conteúdo completo do post (suporta Markdown)"
                    required={activeLocale === 'pt-BR'}
                  />
                  <div className="form-text">Suporta Markdown para formatação</div>
                </div>
              </div>
            </div>
          </div>

          {/* Barra lateral */}
          <div className="col-lg-4">
            {/* Status */}
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0">Publicação</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="isPublished"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="isPublished">
                      {formData.isPublished ? 'Publicado' : 'Rascunho'}
                    </label>
                  </div>
                </div>

                {formData.isPublished && (
                  <div className="mb-3">
                    <label className="form-label">Data de Publicação</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.publishedAt}
                      onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Configurações */}
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0">Configurações</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Slug (URL)</label>
                  <div className="input-group">
                    <span className="input-group-text">/blog/</span>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="meu-post"
                      required
                    />
                  </div>
                  <div className="form-text">Identificador único na URL</div>
                </div>
              </div>
            </div>

            {/* Preview link */}
            {formData.slug && (
              <div className="card">
                <div className="card-body">
                  <a
                    href={`/blog/${formData.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline-secondary w-100"
                  >
                    <i className="bi bi-eye me-2"></i>
                    Visualizar Post
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
