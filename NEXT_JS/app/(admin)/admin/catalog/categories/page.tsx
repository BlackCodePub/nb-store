'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Category {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  description: string | null;
  descriptionEn: string | null;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  children: { id: string; name: string }[];
  productCount: number;
  createdAt: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState<'pt' | 'en'>('pt');
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    parentId: '',
  });
  const [error, setError] = useState('');

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openModal = (category?: Category) => {
    setActiveTab('pt');
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        nameEn: category.nameEn || '',
        description: category.description || '',
        descriptionEn: category.descriptionEn || '',
        parentId: category.parentId || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', nameEn: '', description: '', descriptionEn: '', parentId: '' });
    }
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', nameEn: '', description: '', descriptionEn: '', parentId: '' });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      
      const res = await fetch(url, {
        method: editingCategory ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          nameEn: formData.nameEn || null,
          description: formData.description || null,
          descriptionEn: formData.descriptionEn || null,
          parentId: formData.parentId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar');
      }

      closeModal();
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar categoria');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (category.children && category.children.length > 0) {
      if (!confirm(`Esta categoria tem ${category.children.length} subcategoria(s). Elas serão desvinculadas. Continuar?`)) {
        return;
      }
    } else if (category.productCount > 0) {
      if (!confirm(`Esta categoria tem ${category.productCount} produto(s). Os produtos serão desvinculados. Continuar?`)) {
        return;
      }
    } else if (!confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir');
      }
      fetchCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir categoria');
    }
  };

  // Organizar categorias em árvore
  const rootCategories = categories.filter(c => !c.parentId);
  const getSubcategories = (parentId: string) => categories.filter(c => c.parentId === parentId);

  // Categorias disponíveis como pai (não pode ser ela mesma ou suas filhas)
  const getAvailableParents = () => {
    if (!editingCategory) return categories;
    const childIds = new Set(editingCategory.children?.map(c => c.id) || []);
    return categories.filter(c => c.id !== editingCategory.id && !childIds.has(c.id));
  };

  const renderCategoryRow = (category: Category, level: number = 0) => {
    const subcategories = getSubcategories(category.id);
    
    return (
      <React.Fragment key={category.id}>
        <tr>
          <td className="fw-medium">
            <span style={{ paddingLeft: level * 24 }}>
              {level > 0 && <i className="bi bi-arrow-return-right text-muted me-2"></i>}
              {category.name}
              {category.nameEn && (
                <small className="text-muted ms-2">({category.nameEn})</small>
              )}
            </span>
          </td>
          <td>
            <code className="text-muted">{category.slug}</code>
          </td>
          <td>
            {category.parent ? (
              <span className="badge bg-light text-dark">
                <i className="bi bi-folder me-1"></i>
                {category.parent.name}
              </span>
            ) : (
              <span className="text-muted">—</span>
            )}
          </td>
          <td>
            <span className="badge bg-secondary">{category.productCount}</span>
          </td>
          <td>
            {category.children && category.children.length > 0 && (
              <span className="badge bg-info">{category.children.length} sub</span>
            )}
          </td>
          <td>
            <div className="btn-group btn-group-sm">
              <button
                className="btn btn-outline-primary"
                onClick={() => openModal(category)}
                title="Editar"
              >
                <i className="bi bi-pencil"></i>
              </button>
              <button
                className="btn btn-outline-danger"
                onClick={() => handleDelete(category)}
                title="Excluir"
              >
                <i className="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
        {subcategories.map(sub => renderCategoryRow(sub, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">
          <i className="bi bi-tags me-2"></i>
          Categorias
        </h1>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <i className="bi bi-plus-lg me-2"></i>
          Nova Categoria
        </button>
      </div>

      {/* Tabela de Categorias */}
      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Nome</th>
                <th>Slug</th>
                <th>Categoria Pai</th>
                <th>Produtos</th>
                <th>Subcategorias</th>
                <th style={{ width: '120px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    <div className="spinner-border spinner-border-sm me-2"></div>
                    Carregando...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    Nenhuma categoria cadastrada
                  </td>
                </tr>
              ) : (
                rootCategories.map((category) => renderCategoryRow(category))
              )}
            </tbody>
          </table>
        </div>
        
        {!loading && categories.length > 0 && (
          <div className="card-footer bg-light">
            <small className="text-muted">
              {categories.length} categoria(s) • {rootCategories.length} principal(is)
            </small>
          </div>
        )}
      </div>

      {/* Modal de Criar/Editar */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger py-2">{error}</div>
                  )}
                  
                  {/* Tabs de idioma */}
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
                  </ul>
                  
                  {/* Tab: Português */}
                  {activeTab === 'pt' && (
                    <div className="row g-3">
                      <div className="col-md-8">
                        <label className="form-label">Nome (PT-BR) *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ex: Eletrônicos"
                          required
                        />
                        <div className="form-text">O slug será gerado automaticamente</div>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Categoria Pai</label>
                        <select
                          className="form-select"
                          value={formData.parentId}
                          onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                        >
                          <option value="">Nenhuma (Principal)</option>
                          {getAvailableParents().map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.parent ? `${c.parent.name} > ` : ''}{c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label">Descrição (PT-BR)</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Descrição da categoria em português..."
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
                          placeholder="Ex: Electronics"
                        />
                        <small className="text-muted">Deixe em branco para usar o nome em português</small>
                      </div>
                      <div className="col-12">
                        <label className="form-label">Description (EN-US)</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={formData.descriptionEn}
                          onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                          placeholder="Category description in English..."
                        />
                      </div>
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
                      editingCategory ? 'Salvar' : 'Criar'
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
