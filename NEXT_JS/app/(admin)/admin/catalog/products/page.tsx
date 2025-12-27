'use client';

import { useState, useEffect, useCallback } from 'react';

interface Category {
  id: string;
  name: string;
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  active: boolean;
}

interface ProductImage {
  id: string;
  url: string;
  position: number;
  variantId: string | null;
}

interface Product {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  description: string | null;
  descriptionEn: string | null;
  price: number;
  type: 'physical' | 'digital';
  active: boolean;
  category: Category | null;
  categoryId: string | null;
  variants: ProductVariant[];
  images: ProductImage[];
  // SEO
  metaTitle: string | null;
  metaDescription: string | null;
  // Peso e dimensões
  weight: number | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  createdAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'pt' | 'en' | 'details' | 'seo' | 'shipping'>('pt');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    price: '',
    stock: '0',
    categoryId: '',
    type: 'physical' as 'physical' | 'digital',
    active: true,
    // SEO
    metaTitle: '',
    metaDescription: '',
    // Peso e dimensões
    weight: '',
    width: '',
    height: '',
    depth: '',
  });
  const [error, setError] = useState('');

  // Search and filter
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const openModal = (mode: 'create' | 'edit', product?: Product) => {
    setModalMode(mode);
    setError('');
    setActiveTab('pt');
    
    if (mode === 'edit' && product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        nameEn: product.nameEn || '',
        description: product.description || '',
        descriptionEn: product.descriptionEn || '',
        price: product.price.toString(),
        stock: product.variants[0]?.stock?.toString() || '0',
        categoryId: product.categoryId || '',
        type: product.type || 'physical',
        active: product.active,
        metaTitle: product.metaTitle || '',
        metaDescription: product.metaDescription || '',
        weight: product.weight?.toString() || '',
        width: product.width?.toString() || '',
        height: product.height?.toString() || '',
        depth: product.depth?.toString() || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        nameEn: '',
        description: '',
        descriptionEn: '',
        price: '',
        stock: '0',
        categoryId: '',
        type: 'physical',
        active: true,
        metaTitle: '',
        metaDescription: '',
        weight: '',
        width: '',
        height: '',
        depth: '',
      });
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        name: formData.name,
        nameEn: formData.nameEn || null,
        description: formData.description || null,
        descriptionEn: formData.descriptionEn || null,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        categoryId: formData.categoryId || null,
        type: formData.type,
        active: formData.active,
        metaTitle: formData.metaTitle || null,
        metaDescription: formData.metaDescription || null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        width: formData.width ? parseFloat(formData.width) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        depth: formData.depth ? parseFloat(formData.depth) : null,
      };

      const url = modalMode === 'edit' && editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      
      const res = await fetch(url, {
        method: modalMode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar');
      }

      closeModal();
      fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir');
      }
      fetchProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir produto');
    }
  };

  const toggleStatus = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !product.active }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao atualizar');
      }

      fetchProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar status');
    }
  };

  // Filtrar produtos
  const filteredProducts = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filterCategory && p.categoryId !== filterCategory) {
      return false;
    }
    if (filterStatus === 'active' && !p.active) {
      return false;
    }
    if (filterStatus === 'inactive' && p.active) {
      return false;
    }
    if (filterType && p.type !== filterType) {
      return false;
    }
    return true;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">
          <i className="bi bi-box-seam me-2"></i>
          Produtos
        </h1>
        <button className="btn btn-primary" onClick={() => openModal('create')}>
          <i className="bi bi-plus-lg me-2"></i>
          Novo Produto
        </button>
      </div>

      {/* Filtros */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">Todas categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">Todos tipos</option>
                <option value="physical">Físico</option>
                <option value="digital">Digital</option>
              </select>
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Todos status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>
            <div className="col-md-3">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearch('');
                  setFilterCategory('');
                  setFilterStatus('');
                  setFilterType('');
                }}
              >
                <i className="bi bi-x-circle me-1"></i>
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: '60px' }}>Imagem</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th>Status</th>
                <th style={{ width: '150px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">
                    <div className="spinner-border spinner-border-sm me-2"></div>
                    Carregando...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-muted">
                    {products.length === 0 
                      ? 'Nenhum produto cadastrado' 
                      : 'Nenhum produto encontrado com os filtros aplicados'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      {product.images && product.images[0] ? (
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          className="rounded"
                          style={{ width: 50, height: 50, objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          className="rounded bg-light d-flex align-items-center justify-content-center"
                          style={{ width: 50, height: 50 }}
                        >
                          <i className="bi bi-image text-muted"></i>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="fw-medium">{product.name}</div>
                      <small className="text-muted">{product.variants?.[0]?.sku || '—'}</small>
                    </td>
                    <td>
                      <span className={`badge ${product.type === 'digital' ? 'bg-info' : 'bg-secondary'}`}>
                        <i className={`bi ${product.type === 'digital' ? 'bi-cloud-download' : 'bi-box'} me-1`}></i>
                        {product.type === 'digital' ? 'Digital' : 'Físico'}
                      </span>
                    </td>
                    <td>
                      {product.category ? (
                        <span className="badge bg-light text-dark">{product.category.name}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="fw-medium">{formatPrice(product.price)}</td>
                    <td>
                      {product.type === 'digital' ? (
                        <span className="badge bg-info">∞</span>
                      ) : (
                        <span className={`badge ${
                          (product.variants[0]?.stock || 0) > 10 
                            ? 'bg-success' 
                            : (product.variants[0]?.stock || 0) > 0 
                              ? 'bg-warning text-dark' 
                              : 'bg-danger'
                        }`}>
                          {product.variants[0]?.stock || 0}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={product.active}
                          onChange={() => toggleStatus(product)}
                          title={product.active ? 'Desativar' : 'Ativar'}
                        />
                        <label className="form-check-label small">
                          {product.active ? 'Ativo' : 'Inativo'}
                        </label>
                      </div>
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => openModal('edit', product)}
                          title="Editar"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <a
                          href={`/admin/catalog/products/${product.id}`}
                          className="btn btn-outline-secondary"
                          title="Detalhes"
                        >
                          <i className="bi bi-eye"></i>
                        </a>
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => handleDelete(product)}
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
        
        {/* Rodapé com estatísticas */}
        {!loading && (
          <div className="card-footer bg-light">
            <small className="text-muted">
              Mostrando {filteredProducts.length} de {products.length} produto(s)
              {' | '}
              <span className="text-info">{products.filter(p => p.type === 'digital').length} digitais</span>
              {' | '}
              <span className="text-secondary">{products.filter(p => p.type === 'physical').length} físicos</span>
            </small>
          </div>
        )}
      </div>

      {/* Modal de Criar/Editar Produto */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {modalMode === 'edit' ? 'Editar Produto' : 'Novo Produto'}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger py-2">{error}</div>
                  )}
                  
                  {/* Tabs de navegação */}
                  <ul className="nav nav-tabs mb-3">
                    <li className="nav-item">
                      <button 
                        type="button"
                        className={`nav-link ${activeTab === 'pt' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pt')}
                      >
                        <i className="bi bi-flag me-1"></i>
                        Português (BR)
                      </button>
                    </li>
                    <li className="nav-item">
                      <button 
                        type="button"
                        className={`nav-link ${activeTab === 'en' ? 'active' : ''}`}
                        onClick={() => setActiveTab('en')}
                      >
                        <i className="bi bi-flag me-1"></i>
                        English (US)
                      </button>
                    </li>
                    <li className="nav-item">
                      <button 
                        type="button"
                        className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => setActiveTab('details')}
                      >
                        <i className="bi bi-gear me-1"></i>
                        Detalhes
                      </button>
                    </li>
                    <li className="nav-item">
                      <button 
                        type="button"
                        className={`nav-link ${activeTab === 'seo' ? 'active' : ''}`}
                        onClick={() => setActiveTab('seo')}
                      >
                        <i className="bi bi-search me-1"></i>
                        SEO
                      </button>
                    </li>
                    <li className="nav-item">
                      <button 
                        type="button"
                        className={`nav-link ${activeTab === 'shipping' ? 'active' : ''}`}
                        onClick={() => setActiveTab('shipping')}
                        disabled={formData.type === 'digital'}
                      >
                        <i className="bi bi-truck me-1"></i>
                        Frete
                      </button>
                    </li>
                  </ul>
                  
                  {/* Tab: Português */}
                  {activeTab === 'pt' && (
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label">Nome (PT-BR) *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ex: Camiseta Premium"
                          required
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Descrição (PT-BR)</label>
                        <textarea
                          className="form-control"
                          rows={4}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Descrição do produto em português..."
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Tab: English */}
                  {activeTab === 'en' && (
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label">Name (EN-US)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.nameEn}
                          onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                          placeholder="Ex: Premium T-Shirt"
                        />
                        <small className="text-muted">Deixe em branco para usar o nome em português</small>
                      </div>
                      <div className="col-12">
                        <label className="form-label">Description (EN-US)</label>
                        <textarea
                          className="form-control"
                          rows={4}
                          value={formData.descriptionEn}
                          onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                          placeholder="Product description in English..."
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Tab: Detalhes */}
                  {activeTab === 'details' && (
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label">Tipo *</label>
                        <select
                          className="form-select"
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value as 'physical' | 'digital' })}
                        >
                          <option value="physical">Produto Físico</option>
                          <option value="digital">Produto Digital</option>
                        </select>
                        <small className="text-muted">
                          {formData.type === 'digital' 
                            ? 'Entrega via download, sem controle de estoque' 
                            : 'Entrega física, com controle de estoque'}
                        </small>
                      </div>
                      
                      <div className="col-md-4">
                        <label className="form-label">Categoria</label>
                        <select
                          className="form-select"
                          value={formData.categoryId}
                          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        >
                          <option value="">Sem categoria</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="col-md-4">
                        <label className="form-label">Status</label>
                        <select
                          className="form-select"
                          value={formData.active ? 'true' : 'false'}
                          onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
                        >
                          <option value="true">Ativo</option>
                          <option value="false">Inativo</option>
                        </select>
                      </div>
                      
                      <div className="col-md-6">
                        <label className="form-label">Preço (R$) *</label>
                        <div className="input-group">
                          <span className="input-group-text">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-control"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            placeholder="0,00"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="col-md-6">
                        <label className="form-label">
                          Estoque Inicial
                          {formData.type === 'digital' && <span className="badge bg-info ms-2">Ilimitado</span>}
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="form-control"
                          value={formData.stock}
                          onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                          disabled={formData.type === 'digital'}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Tab: SEO */}
                  {activeTab === 'seo' && (
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label">Meta Title</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.metaTitle}
                          onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                          placeholder="Título para mecanismos de busca (max 60 caracteres)"
                          maxLength={60}
                        />
                        <small className="text-muted">
                          {formData.metaTitle.length}/60 caracteres
                        </small>
                      </div>
                      <div className="col-12">
                        <label className="form-label">Meta Description</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={formData.metaDescription}
                          onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                          placeholder="Descrição para mecanismos de busca (max 160 caracteres)"
                          maxLength={160}
                        />
                        <small className="text-muted">
                          {formData.metaDescription.length}/160 caracteres
                        </small>
                      </div>
                      <div className="col-12">
                        <div className="card bg-light">
                          <div className="card-body">
                            <small className="text-muted">Prévia no Google:</small>
                            <div className="mt-2">
                              <div className="text-primary" style={{ fontSize: '18px' }}>
                                {formData.metaTitle || formData.name || 'Título do produto'}
                              </div>
                              <div className="text-success small">
                                seusite.com.br/produto/{formData.name ? formData.name.toLowerCase().replace(/\s+/g, '-') : 'slug'}
                              </div>
                              <div className="text-muted small">
                                {formData.metaDescription || formData.description || 'Descrição do produto aparecerá aqui...'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Tab: Frete (só para físico) */}
                  {activeTab === 'shipping' && formData.type === 'physical' && (
                    <div className="row g-3">
                      <div className="col-12">
                        <div className="alert alert-info">
                          <i className="bi bi-info-circle me-2"></i>
                          Preencha peso e dimensões para cálculo correto do frete pelos Correios.
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Peso (gramas)</label>
                        <div className="input-group">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="form-control"
                            value={formData.weight}
                            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                            placeholder="Ex: 500"
                          />
                          <span className="input-group-text">g</span>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Largura (cm)</label>
                        <div className="input-group">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            className="form-control"
                            value={formData.width}
                            onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                            placeholder="Ex: 20"
                          />
                          <span className="input-group-text">cm</span>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Altura (cm)</label>
                        <div className="input-group">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            className="form-control"
                            value={formData.height}
                            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                            placeholder="Ex: 10"
                          />
                          <span className="input-group-text">cm</span>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Profundidade (cm)</label>
                        <div className="input-group">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            className="form-control"
                            value={formData.depth}
                            onChange={(e) => setFormData({ ...formData, depth: e.target.value })}
                            placeholder="Ex: 5"
                          />
                          <span className="input-group-text">cm</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {modalMode === 'edit' && editingProduct && (
                    <div className="alert alert-info mt-3 mb-0">
                      <i className="bi bi-info-circle me-2"></i>
                      Para gerenciar variantes e imagens, acesse a página de detalhes do produto.
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Salvando...
                      </>
                    ) : (
                      modalMode === 'edit' ? 'Salvar Alterações' : 'Criar Produto'
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
