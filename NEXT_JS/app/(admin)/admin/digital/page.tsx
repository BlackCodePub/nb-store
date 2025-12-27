'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DigitalAsset {
  id: string;
  productId: string;
  variantId: string | null;
  product?: {
    name: string;
    slug: string;
  };
  variant?: {
    name: string;
  };
  kind: 'file' | 'link' | 'license';
  name: string;
  filePath: string | null;
  url: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export default function DigitalAssetsPage() {
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<DigitalAsset | null>(null);
  const [products, setProducts] = useState<{ id: string; name: string; variants: { id: string; name: string }[] }[]>([]);
  
  const [formData, setFormData] = useState({
    productId: '',
    variantId: '',
    kind: 'file' as 'file' | 'link' | 'license',
    name: '',
    filePath: '',
    url: '',
  });
  
  useEffect(() => {
    fetchAssets();
    fetchProducts();
  }, []);
  
  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/digital-assets');
      const data = await res.json();
      setAssets(data.assets || []);
    } catch (error) {
      console.error('Erro ao carregar assets:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products?type=digital');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingAsset
        ? `/api/admin/digital-assets/${editingAsset.id}`
        : '/api/admin/digital-assets';
      
      const res = await fetch(url, {
        method: editingAsset ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          variantId: formData.variantId || null,
          filePath: formData.kind === 'file' ? formData.filePath : null,
          url: formData.kind === 'link' ? formData.url : null,
        }),
      });
      
      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchAssets();
      }
    } catch (error) {
      console.error('Erro ao salvar asset:', error);
    }
  };
  
  const handleEdit = (asset: DigitalAsset) => {
    setEditingAsset(asset);
    setFormData({
      productId: asset.productId,
      variantId: asset.variantId || '',
      kind: asset.kind,
      name: asset.name,
      filePath: asset.filePath || '',
      url: asset.url || '',
    });
    setShowModal(true);
  };
  
  const handleDelete = async (asset: DigitalAsset) => {
    if (!confirm(`Tem certeza que deseja excluir "${asset.name}"?`)) return;
    
    try {
      await fetch(`/api/admin/digital-assets/${asset.id}`, { method: 'DELETE' });
      fetchAssets();
    } catch (error) {
      console.error('Erro ao excluir asset:', error);
    }
  };
  
  const resetForm = () => {
    setEditingAsset(null);
    setFormData({
      productId: '',
      variantId: '',
      kind: 'file',
      name: '',
      filePath: '',
      url: '',
    });
  };
  
  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };
  
  const getKindBadge = (kind: string) => {
    const badges: Record<string, { bg: string; icon: string; text: string }> = {
      file: { bg: 'bg-primary', icon: 'bi-file-earmark', text: 'Arquivo' },
      link: { bg: 'bg-info', icon: 'bi-link-45deg', text: 'Link' },
      license: { bg: 'bg-warning text-dark', icon: 'bi-key', text: 'Licença' },
    };
    return badges[kind] || badges.file;
  };
  
  const selectedProduct = products.find(p => p.id === formData.productId);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Assets Digitais</h1>
        <button className="btn btn-primary" onClick={openNewModal}>
          <i className="bi bi-plus-lg me-2"></i>
          Novo Asset
        </button>
      </div>
      
      {/* Info */}
      <div className="alert alert-info mb-4">
        <i className="bi bi-info-circle me-2"></i>
        Assets digitais são entregues automaticamente ao cliente quando o pedido é pago.
        Podem ser arquivos, links externos ou licenças/chaves.
      </div>
      
      {/* Tabela */}
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Nome</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Caminho/URL</th>
                <th style={{width: '120px'}}>Ações</th>
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
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    Nenhum asset digital cadastrado
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const badge = getKindBadge(asset.kind);
                  return (
                    <tr key={asset.id}>
                      <td>
                        <div className="fw-medium">{asset.name}</div>
                      </td>
                      <td>
                        <div>{asset.product?.name || '-'}</div>
                        {asset.variant && (
                          <small className="text-muted">
                            Variante: {asset.variant.name}
                          </small>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${badge.bg}`}>
                          <i className={`bi ${badge.icon} me-1`}></i>
                          {badge.text}
                        </span>
                      </td>
                      <td>
                        <code className="small">
                          {asset.kind === 'file' && asset.filePath}
                          {asset.kind === 'link' && asset.url}
                          {asset.kind === 'license' && '(Licença)'}
                        </code>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleEdit(asset)}
                            title="Editar"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(asset)}
                            title="Excluir"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingAsset ? 'Editar Asset' : 'Novo Asset Digital'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Produto *</label>
                    <select
                      className="form-select"
                      value={formData.productId}
                      onChange={(e) => setFormData({ ...formData, productId: e.target.value, variantId: '' })}
                      required
                    >
                      <option value="">Selecione um produto</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedProduct && selectedProduct.variants.length > 0 && (
                    <div className="mb-3">
                      <label className="form-label">Variante (opcional)</label>
                      <select
                        className="form-select"
                        value={formData.variantId}
                        onChange={(e) => setFormData({ ...formData, variantId: e.target.value })}
                      >
                        <option value="">Todas as variantes</option>
                        {selectedProduct.variants.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <label className="form-label">Nome *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Ex: Manual PDF, Código de Ativação"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Tipo *</label>
                    <select
                      className="form-select"
                      value={formData.kind}
                      onChange={(e) => setFormData({ ...formData, kind: e.target.value as 'file' | 'link' | 'license' })}
                    >
                      <option value="file">Arquivo (download)</option>
                      <option value="link">Link Externo</option>
                      <option value="license">Licença/Chave</option>
                    </select>
                  </div>
                  
                  {formData.kind === 'file' && (
                    <div className="mb-3">
                      <label className="form-label">Caminho do Arquivo *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.filePath}
                        onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
                        required
                        placeholder="storage/digital/produto.pdf"
                      />
                      <div className="form-text">
                        Caminho relativo dentro da pasta storage/digital/
                      </div>
                    </div>
                  )}
                  
                  {formData.kind === 'link' && (
                    <div className="mb-3">
                      <label className="form-label">URL *</label>
                      <input
                        type="url"
                        className="form-control"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        required
                        placeholder="https://exemplo.com/download"
                      />
                    </div>
                  )}
                  
                  {formData.kind === 'license' && (
                    <div className="alert alert-info mb-0">
                      <i className="bi bi-info-circle me-2"></i>
                      Licenças são geradas automaticamente com base nas regras configuradas.
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingAsset ? 'Salvar' : 'Criar Asset'}
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
