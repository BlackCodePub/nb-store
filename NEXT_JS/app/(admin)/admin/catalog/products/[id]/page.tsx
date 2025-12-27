'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

interface ProductImage {
  id: string;
  url: string;
  position: number;
  variantId: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  active: boolean;
  category: Category | null;
  categoryId: string | null;
  variants: ProductVariant[];
  images: ProductImage[];
  createdAt: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Variant modal
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [variantForm, setVariantForm] = useState({ name: '', sku: '', price: '', stock: '0' });
  
  // Image modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageForm, setImageForm] = useState({ urls: '', variantId: '', position: '0' });
  
  const [error, setError] = useState('');

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`);
      if (!res.ok) throw new Error('Produto não encontrado');
      const data = await res.json();
      setProduct(data.product);
    } catch (err) {
      console.error('Erro ao carregar produto:', err);
      router.push('/admin/catalog/products');
    } finally {
      setLoading(false);
    }
  }, [productId, router]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // === VARIANTES ===
  const openVariantModal = (variant?: ProductVariant) => {
    if (variant) {
      setEditingVariant(variant);
      setVariantForm({
        name: variant.name,
        sku: variant.sku,
        price: variant.price.toString(),
        stock: variant.stock.toString(),
      });
    } else {
      setEditingVariant(null);
      setVariantForm({ name: '', sku: '', price: product?.price.toString() || '', stock: '0' });
    }
    setError('');
    setShowVariantModal(true);
  };

  const handleVariantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        productId,
        name: variantForm.name,
        sku: variantForm.sku,
        price: parseFloat(variantForm.price),
        stock: parseInt(variantForm.stock),
      };

      const url = editingVariant
        ? `/api/admin/products/${productId}/variants/${editingVariant.id}`
        : `/api/admin/products/${productId}/variants`;

      const res = await fetch(url, {
        method: editingVariant ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar variante');
      }

      setShowVariantModal(false);
      fetchProduct();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const deleteVariant = async (variant: ProductVariant) => {
    if (!confirm(`Excluir a variante "${variant.name}" (${variant.sku})?`)) return;

    try {
      const res = await fetch(`/api/admin/products/${productId}/variants/${variant.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao excluir');
      fetchProduct();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir variante');
    }
  };

  // === IMAGENS ===
  const openImageModal = () => {
    setImageForm({ urls: '', variantId: '', position: '0' });
    setError('');
    setShowImageModal(true);
  };

  const handleImageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const urls = imageForm.urls
        .split(/\n|,/)
        .map((u) => u.trim())
        .filter(Boolean);

      if (urls.length === 0) {
        throw new Error('Informe pelo menos uma URL');
      }

      const payload = {
        productId,
        urls,
        variantId: imageForm.variantId || null,
        position: parseInt(imageForm.position),
      };

      const res = await fetch(`/api/admin/products/${productId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao adicionar imagem');
      }

      setShowImageModal(false);
      fetchProduct();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const deleteImage = async (image: ProductImage) => {
    if (!confirm('Excluir esta imagem?')) return;

    try {
      const res = await fetch(`/api/admin/products/${productId}/images/${image.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao excluir');
      fetchProduct();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir imagem');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border"></div>
        <p className="mt-2">Carregando produto...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="alert alert-danger">
        Produto não encontrado
        <Link href="/admin/catalog/products" className="ms-2">Voltar</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item">
                <Link href="/admin/catalog/products">Produtos</Link>
              </li>
              <li className="breadcrumb-item active">{product.name}</li>
            </ol>
          </nav>
          <h1 className="h3 mb-0">{product.name}</h1>
        </div>
        <div className="d-flex gap-2">
          <span className={`badge ${product.active ? 'bg-success' : 'bg-secondary'} align-self-center`}>
            {product.active ? 'Ativo' : 'Inativo'}
          </span>
          <Link href="/admin/catalog/products" className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left me-1"></i>
            Voltar
          </Link>
        </div>
      </div>

      <div className="row g-4">
        {/* Informações do Produto */}
        <div className="col-lg-4">
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Informações
              </h5>
            </div>
            <div className="card-body">
              <dl className="mb-0">
                <dt className="text-muted small">Preço base</dt>
                <dd className="mb-3 fs-5 fw-medium">{formatPrice(product.price)}</dd>
                
                <dt className="text-muted small">Categoria</dt>
                <dd className="mb-3">
                  {product.category ? (
                    <span className="badge bg-light text-dark">{product.category.name}</span>
                  ) : (
                    <span className="text-muted">Sem categoria</span>
                  )}
                </dd>
                
                <dt className="text-muted small">Slug</dt>
                <dd className="mb-3">
                  <code className="text-muted">{product.slug}</code>
                </dd>
                
                {product.description && (
                  <>
                    <dt className="text-muted small">Descrição</dt>
                    <dd className="mb-0">{product.description}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        </div>

        {/* Variantes */}
        <div className="col-lg-8">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-layers me-2"></i>
                Variantes
                <span className="badge bg-secondary ms-2">{product.variants.length}</span>
              </h5>
              <button className="btn btn-sm btn-primary" onClick={() => openVariantModal()}>
                <i className="bi bi-plus-lg me-1"></i>
                Adicionar
              </button>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Nome</th>
                    <th>SKU</th>
                    <th>Preço</th>
                    <th>Estoque</th>
                    <th style={{ width: '100px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-3 text-muted">
                        Nenhuma variante cadastrada
                      </td>
                    </tr>
                  ) : (
                    product.variants.map((v) => (
                      <tr key={v.id}>
                        <td className="fw-medium">{v.name}</td>
                        <td><code>{v.sku}</code></td>
                        <td>{formatPrice(v.price)}</td>
                        <td>
                          <span className={`badge ${
                            v.stock > 10 ? 'bg-success' : v.stock > 0 ? 'bg-warning text-dark' : 'bg-danger'
                          }`}>
                            {v.stock}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => openVariantModal(v)}
                              title="Editar"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => deleteVariant(v)}
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

          {/* Imagens */}
          <div className="card shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-images me-2"></i>
                Imagens
                <span className="badge bg-secondary ms-2">{product.images.length}</span>
              </h5>
              <button className="btn btn-sm btn-primary" onClick={openImageModal}>
                <i className="bi bi-plus-lg me-1"></i>
                Adicionar
              </button>
            </div>
            <div className="card-body">
              {product.images.length === 0 ? (
                <p className="text-muted text-center mb-0">Nenhuma imagem cadastrada</p>
              ) : (
                <div className="row g-3">
                  {product.images
                    .sort((a, b) => a.position - b.position)
                    .map((img) => (
                      <div key={img.id} className="col-6 col-md-4 col-lg-3">
                        <div className="card h-100">
                          <img
                            src={img.url}
                            alt={`Imagem ${img.position}`}
                            className="card-img-top"
                            style={{ height: 120, objectFit: 'cover' }}
                          />
                          <div className="card-body p-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <small className="text-muted">Pos: {img.position}</small>
                              {img.variantId && (
                                <span className="badge bg-light text-dark small">
                                  {product.variants.find((v) => v.id === img.variantId)?.sku}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="card-footer p-1">
                            <button
                              className="btn btn-sm btn-outline-danger w-100"
                              onClick={() => deleteImage(img)}
                            >
                              <i className="bi bi-trash me-1"></i>
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Variante */}
      {showVariantModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingVariant ? 'Editar Variante' : 'Nova Variante'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowVariantModal(false)}></button>
              </div>
              <form onSubmit={handleVariantSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  
                  <div className="mb-3">
                    <label className="form-label">Nome *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={variantForm.name}
                      onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                      placeholder="Ex: Tamanho M, Cor Azul"
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">SKU *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={variantForm.sku}
                      onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                      placeholder="Ex: PROD-001-M"
                      required
                    />
                  </div>
                  
                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label">Preço (R$) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={variantForm.price}
                        onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Estoque</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={variantForm.stock}
                        onChange={(e) => setVariantForm({ ...variantForm, stock: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowVariantModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Imagem */}
      {showImageModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Adicionar Imagens</h5>
                <button type="button" className="btn-close" onClick={() => setShowImageModal(false)}></button>
              </div>
              <form onSubmit={handleImageSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  
                  <div className="mb-3">
                    <label className="form-label">URLs das imagens *</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={imageForm.urls}
                      onChange={(e) => setImageForm({ ...imageForm, urls: e.target.value })}
                      placeholder="Cole uma ou mais URLs (uma por linha ou separadas por vírgula)"
                      required
                    />
                    <div className="form-text">Aceita múltiplas URLs</div>
                  </div>
                  
                  <div className="row g-3">
                    <div className="col-8">
                      <label className="form-label">Variante (opcional)</label>
                      <select
                        className="form-select"
                        value={imageForm.variantId}
                        onChange={(e) => setImageForm({ ...imageForm, variantId: e.target.value })}
                      >
                        <option value="">Produto inteiro</option>
                        {product.variants.map((v) => (
                          <option key={v.id} value={v.id}>{v.name} ({v.sku})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-4">
                      <label className="form-label">Posição</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={imageForm.position}
                        onChange={(e) => setImageForm({ ...imageForm, position: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowImageModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Salvando...' : 'Adicionar'}
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
