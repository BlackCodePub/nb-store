'use client';

import { useState, useEffect } from 'react';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  buttonText: string | null;
  position: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    linkUrl: '',
    buttonText: '',
    position: 0,
    active: true,
    startsAt: '',
    endsAt: '',
  });

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      const res = await fetch('/api/admin/banners');
      if (res.ok) {
        const data = await res.json();
        setBanners(data);
      }
    } catch (error) {
      console.error('Error loading banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        title: banner.title,
        subtitle: banner.subtitle || '',
        imageUrl: banner.imageUrl,
        linkUrl: banner.linkUrl || '',
        buttonText: banner.buttonText || '',
        position: banner.position,
        active: banner.active,
        startsAt: banner.startsAt ? banner.startsAt.slice(0, 16) : '',
        endsAt: banner.endsAt ? banner.endsAt.slice(0, 16) : '',
      });
    } else {
      setEditingBanner(null);
      setFormData({
        title: '',
        subtitle: '',
        imageUrl: '',
        linkUrl: '',
        buttonText: '',
        position: banners.length,
        active: true,
        startsAt: '',
        endsAt: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBanner(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingBanner
        ? `/api/admin/banners/${editingBanner.id}`
        : '/api/admin/banners';

      const res = await fetch(url, {
        method: editingBanner ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          startsAt: formData.startsAt || null,
          endsAt: formData.endsAt || null,
        }),
      });

      if (res.ok) {
        await loadBanners();
        closeModal();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar banner');
      }
    } catch (error) {
      alert('Erro ao salvar banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este banner?')) return;

    try {
      const res = await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadBanners();
      } else {
        alert('Erro ao excluir banner');
      }
    } catch (error) {
      alert('Erro ao excluir banner');
    }
  };

  const toggleActive = async (banner: Banner) => {
    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...banner, active: !banner.active }),
      });
      if (res.ok) {
        await loadBanners();
      }
    } catch (error) {
      alert('Erro ao atualizar banner');
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
            <i className="bi bi-images me-2"></i>
            Banners
          </h1>
          <p className="text-muted mb-0">Gerencie os banners/slides da página inicial</p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i>
          Novo Banner
        </button>
      </div>

      {/* Lista de Banners */}
      {banners.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bi bi-images text-muted mb-3" style={{ fontSize: '3rem' }}></i>
            <h5>Nenhum banner cadastrado</h5>
            <p className="text-muted">Clique em "Novo Banner" para adicionar o primeiro.</p>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {banners.map((banner) => (
            <div key={banner.id} className="col-md-6 col-lg-4">
              <div className="card border-0 shadow-sm h-100">
                <div
                  className="card-img-top bg-secondary"
                  style={{
                    height: 150,
                    backgroundImage: `url(${banner.imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="d-flex justify-content-between p-2">
                    <span className={`badge ${banner.active ? 'bg-success' : 'bg-secondary'}`}>
                      {banner.active ? 'Ativo' : 'Inativo'}
                    </span>
                    <span className="badge bg-dark">Posição: {banner.position}</span>
                  </div>
                </div>
                <div className="card-body">
                  <h6 className="card-title mb-1">{banner.title}</h6>
                  {banner.subtitle && (
                    <p className="card-text small text-muted mb-2">{banner.subtitle}</p>
                  )}
                  {banner.linkUrl && (
                    <small className="text-primary d-block mb-2">
                      <i className="bi bi-link-45deg me-1"></i>
                      {banner.linkUrl}
                    </small>
                  )}
                  {(banner.startsAt || banner.endsAt) && (
                    <small className="text-muted d-block">
                      <i className="bi bi-calendar me-1"></i>
                      {banner.startsAt && new Date(banner.startsAt).toLocaleDateString('pt-BR')}
                      {banner.startsAt && banner.endsAt && ' - '}
                      {banner.endsAt && new Date(banner.endsAt).toLocaleDateString('pt-BR')}
                    </small>
                  )}
                </div>
                <div className="card-footer bg-transparent border-0 d-flex gap-2">
                  <button
                    onClick={() => toggleActive(banner)}
                    className={`btn btn-sm ${banner.active ? 'btn-outline-secondary' : 'btn-outline-success'}`}
                    title={banner.active ? 'Desativar' : 'Ativar'}
                  >
                    <i className={`bi ${banner.active ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </button>
                  <button
                    onClick={() => openModal(banner)}
                    className="btn btn-sm btn-outline-primary"
                    title="Editar"
                  >
                    <i className="bi bi-pencil"></i>
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="btn btn-sm btn-outline-danger"
                    title="Excluir"
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingBanner ? 'Editar Banner' : 'Novo Banner'}
                </h5>
                <button onClick={closeModal} className="btn-close"></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label">Título *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Posição</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })}
                        min="0"
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Subtítulo</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.subtitle}
                        onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">URL da Imagem *</label>
                      <input
                        type="url"
                        className="form-control"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        placeholder="https://..."
                        required
                      />
                      {formData.imageUrl && (
                        <div className="mt-2">
                          <img
                            src={formData.imageUrl}
                            alt="Preview"
                            className="img-fluid rounded"
                            style={{ maxHeight: 150 }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="col-md-8">
                      <label className="form-label">URL do Link</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.linkUrl}
                        onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                        placeholder="/products ou https://..."
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Texto do Botão</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.buttonText}
                        onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                        placeholder="Saiba mais"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Início da Exibição</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={formData.startsAt}
                        onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Fim da Exibição</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={formData.endsAt}
                        onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="bannerActive"
                          checked={formData.active}
                          onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        />
                        <label className="form-check-label" htmlFor="bannerActive">
                          Banner ativo
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={closeModal} className="btn btn-outline-secondary">
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
