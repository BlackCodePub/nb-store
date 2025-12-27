'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PostFormData {
  slug: string;
  isPublished: boolean;
  publishedAt: string;
}

const LOCALES = [
  { code: 'pt-BR', name: 'Português (BR)' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export default function NewPostPage() {
  const router = useRouter();
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeLocale, setActiveLocale] = useState('pt-BR');
  
  const [formData, setFormData] = useState<PostFormData>({
    slug: '',
    isPublished: false,
    publishedAt: '',
  });
  
  // Traduções por locale
  const [translations, setTranslations] = useState<Record<string, { title: string; content: string; excerpt: string }>>({
    'pt-BR': { title: '', content: '', excerpt: '' },
    'en': { title: '', content: '', excerpt: '' },
    'es': { title: '', content: '', excerpt: '' },
  });

  const handleTranslationChange = (locale: string, field: 'title' | 'content' | 'excerpt', value: string) => {
    setTranslations(prev => ({
      ...prev,
      [locale]: {
        ...prev[locale],
        [field]: value,
      },
    }));
    
    // Auto-gerar slug a partir do título em pt-BR
    if (locale === 'pt-BR' && field === 'title' && !formData.slug) {
      setFormData(prev => ({ ...prev, slug: slugify(value) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const ptTranslation = translations['pt-BR'];
    if (!ptTranslation.title || !ptTranslation.content) {
      setError('Título e conteúdo em Português são obrigatórios');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: formData.slug || slugify(ptTranslation.title),
          isPublished: formData.isPublished,
          locale: 'pt-BR',
          title: ptTranslation.title,
          content: ptTranslation.content,
          excerpt: ptTranslation.excerpt,
          publishedAt: formData.isPublished 
            ? (formData.publishedAt ? new Date(formData.publishedAt).toISOString() : new Date().toISOString())
            : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar post');
      }

      const data = await res.json();
      
      // Se houver traduções em outros idiomas, salvar
      for (const locale of ['en', 'es']) {
        const trans = translations[locale];
        if (trans.title || trans.content) {
          await fetch(`/api/admin/posts/${data.post.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              locale,
              title: trans.title,
              content: trans.content,
              excerpt: trans.excerpt,
            }),
          });
        }
      }

      router.push('/admin/content/posts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar post');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndPublish = async () => {
    setFormData(prev => ({ ...prev, isPublished: true }));
    // Esperar a atualização do estado e então submeter
    setTimeout(() => {
      document.getElementById('post-form')?.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true })
      );
    }, 100);
  };

  const currentTranslation = translations[activeLocale];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link href="/admin/content/posts" className="text-decoration-none text-muted">
            <i className="bi bi-arrow-left me-2"></i>
            Voltar
          </Link>
          <h1 className="h3 mb-0 mt-2">Novo Post</h1>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-success"
            onClick={handleSaveAndPublish}
            disabled={saving}
          >
            <i className="bi bi-send me-2"></i>
            Salvar e Publicar
          </button>
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
                Salvar Rascunho
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
                        {locale.code === 'pt-BR' && <span className="text-danger ms-1">*</span>}
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
                  <label className="form-label">
                    Título {activeLocale === 'pt-BR' && <span className="text-danger">*</span>}
                  </label>
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
                  <label className="form-label">
                    Conteúdo {activeLocale === 'pt-BR' && <span className="text-danger">*</span>}
                  </label>
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
                      {formData.isPublished ? 'Publicar imediatamente' : 'Salvar como rascunho'}
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
                    <div className="form-text">Deixe vazio para usar a data atual</div>
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
                      onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value) })}
                      placeholder="meu-post"
                    />
                  </div>
                  <div className="form-text">Gerado automaticamente a partir do título</div>
                </div>
              </div>
            </div>

            {/* Dicas */}
            <div className="card bg-light">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="bi bi-lightbulb me-2"></i>
                  Dicas
                </h6>
                <ul className="small mb-0 ps-3">
                  <li>O título e conteúdo em Português são obrigatórios</li>
                  <li>Outros idiomas são opcionais</li>
                  <li>Use Markdown para formatar o conteúdo</li>
                  <li>O slug é gerado automaticamente do título</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
