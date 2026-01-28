'use client';

import { useEffect, useMemo, useState } from 'react';
import { emailTemplateDefinitions, type EmailTemplateKey } from '../../../../../src/shared/email-templates';

interface EmailTemplateOverride {
  key: EmailTemplateKey;
  name: string;
  audience: string | null;
  subject: string;
  html: string;
  text: string;
  updatedAt: string;
}

interface TemplateFormState {
  key: EmailTemplateKey;
  name: string;
  audience: string;
  subject: string;
  html: string;
  text: string;
}

export default function AdminEmailTemplatesPage() {
  const [overrides, setOverrides] = useState<Record<string, EmailTemplateOverride>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<TemplateFormState | null>(null);

  const templates = useMemo(
    () =>
      emailTemplateDefinitions.map((definition) => ({
        definition,
        override: overrides[definition.key] || null,
      })),
    [overrides]
  );

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/email-templates');
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((data && data.error) || 'Erro ao carregar templates.');
      }
      const templates = data as EmailTemplateOverride[];
      const mapped: Record<string, EmailTemplateOverride> = {};
      for (const item of templates) {
        mapped[item.key] = item;
      }
      setOverrides(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar templates.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (key: EmailTemplateKey) => {
    const definition = emailTemplateDefinitions.find((item) => item.key === key);
    if (!definition) return;
    const override = overrides[key];
    setFormData({
      key: definition.key,
      name: override?.name || definition.name,
      audience: override?.audience || definition.audience,
      subject: override?.subject || definition.subject,
      html: override?.html || definition.html,
      text: override?.text || definition.text,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/email-templates/${formData.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          audience: formData.audience,
          subject: formData.subject,
          html: formData.html,
          text: formData.text,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao salvar template.');
      }

      await loadTemplates();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar template.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (key: EmailTemplateKey) => {
    if (!confirm('Deseja restaurar o template padrão?')) return;
    try {
      const res = await fetch(`/api/admin/email-templates/${key}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao restaurar template.');
      }
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao restaurar template.');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 mb-1">
            <i className="bi bi-envelope-paper me-2"></i>
            Templates de E-mail
          </h1>
          <p className="text-muted mb-0">Edite os e-mails automáticos enviados pelo sistema</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="row g-3">
        {templates.map(({ definition, override }) => (
          <div key={definition.key} className="col-md-6 col-lg-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h5 className="card-title mb-1">{definition.name}</h5>
                    <div className="text-muted small">{definition.key}</div>
                  </div>
                  <span className={`badge ${override ? 'bg-primary' : 'bg-secondary'}`}>
                    {override ? 'Personalizado' : 'Padrão'}
                  </span>
                </div>
                <div className="mt-3">
                  <span className="badge bg-light text-dark me-2">{definition.audience}</span>
                  {override?.updatedAt && (
                    <span className="text-muted small">
                      Atualizado em {new Date(override.updatedAt).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <small className="text-muted">Variáveis:</small>
                  <div className="d-flex flex-wrap gap-2 mt-1">
                    {definition.variables.map((variable) => (
                      <span key={variable} className="badge bg-light text-dark">
                        {'{{' + variable + '}}'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card-footer bg-transparent border-0 d-flex gap-2">
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => openModal(definition.key)}
                >
                  <i className="bi bi-pencil me-1"></i>
                  Editar
                </button>
                {override && (
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => handleReset(definition.key)}
                  >
                    <i className="bi bi-arrow-counterclockwise me-1"></i>
                    Restaurar padrão
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && formData && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Editar template</h5>
                <button className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Nome</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Público</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.audience}
                        onChange={(event) => setFormData({ ...formData, audience: event.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Assunto</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.subject}
                        onChange={(event) => setFormData({ ...formData, subject: event.target.value })}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">HTML</label>
                      <textarea
                        className="form-control"
                        rows={12}
                        value={formData.html}
                        onChange={(event) => setFormData({ ...formData, html: event.target.value })}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Texto simples</label>
                      <textarea
                        className="form-control"
                        rows={8}
                        value={formData.text}
                        onChange={(event) => setFormData({ ...formData, text: event.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="alert alert-info mt-3 mb-0">
                    <strong>Variáveis disponíveis:</strong>
                    <div className="mt-2 d-flex flex-wrap gap-2">
                      {emailTemplateDefinitions
                        .find((item) => item.key === formData.key)
                        ?.variables.map((variable) => (
                          <span key={variable} className="badge bg-light text-dark">
                            {'{{' + variable + '}}'}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-2"></i>
                        Salvar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
