'use client';

import { useState, useEffect } from 'react';

interface DiscordRule {
  id: string;
  productId: string | null;
  categoryId: string | null;
  product?: {
    name: string;
  };
  category?: {
    name: string;
  };
  guildId: string;
  roleId: string | null;
  roleName: string | null;
  active: boolean;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

export default function DiscordRulesPage() {
  const [rules, setRules] = useState<DiscordRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<DiscordRule | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [formData, setFormData] = useState({
    targetType: 'product' as 'product' | 'category',
    productId: '',
    categoryId: '',
    guildId: '',
    roleId: '',
    roleName: '',
    active: true,
  });
  
  useEffect(() => {
    fetchRules();
    fetchProducts();
    fetchCategories();
  }, []);
  
  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/discord-rules');
      const data = await res.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error('Erro ao carregar regras:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products?limit=100');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };
  
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingRule
        ? `/api/admin/discord-rules/${editingRule.id}`
        : '/api/admin/discord-rules';
      
      const res = await fetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: formData.targetType === 'product' ? formData.productId : null,
          categoryId: formData.targetType === 'category' ? formData.categoryId : null,
          guildId: formData.guildId,
          roleId: formData.roleId || null,
          roleName: formData.roleName || null,
          active: formData.active,
        }),
      });
      
      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchRules();
      }
    } catch (error) {
      console.error('Erro ao salvar regra:', error);
    }
  };
  
  const handleEdit = (rule: DiscordRule) => {
    setEditingRule(rule);
    setFormData({
      targetType: rule.productId ? 'product' : 'category',
      productId: rule.productId || '',
      categoryId: rule.categoryId || '',
      guildId: rule.guildId,
      roleId: rule.roleId || '',
      roleName: rule.roleName || '',
      active: rule.active,
    });
    setShowModal(true);
  };
  
  const handleToggleActive = async (rule: DiscordRule) => {
    try {
      await fetch(`/api/admin/discord-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !rule.active }),
      });
      fetchRules();
    } catch (error) {
      console.error('Erro ao atualizar regra:', error);
    }
  };
  
  const handleDelete = async (rule: DiscordRule) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) return;
    
    try {
      await fetch(`/api/admin/discord-rules/${rule.id}`, { method: 'DELETE' });
      fetchRules();
    } catch (error) {
      console.error('Erro ao excluir regra:', error);
    }
  };
  
  const resetForm = () => {
    setEditingRule(null);
    setFormData({
      targetType: 'product',
      productId: '',
      categoryId: '',
      guildId: '',
      roleId: '',
      roleName: '',
      active: true,
    });
  };
  
  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">
          <i className="bi bi-discord me-2"></i>
          Regras de Discord Gating
        </h1>
        <button className="btn btn-primary" onClick={openNewModal}>
          <i className="bi bi-plus-lg me-2"></i>
          Nova Regra
        </button>
      </div>
      
      {/* Info */}
      <div className="alert alert-info mb-4">
        <i className="bi bi-info-circle me-2"></i>
        <strong>Discord Gating</strong> permite restringir produtos ou categorias para membros de um servidor Discord específico.
        Os usuários precisarão conectar suas contas Discord para comprar ou baixar conteúdo protegido.
      </div>
      
      {/* Tabela */}
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Alvo</th>
                <th>Servidor (Guild ID)</th>
                <th>Role Necessário</th>
                <th>Status</th>
                <th style={{width: '150px'}}>Ações</th>
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
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    Nenhuma regra de gating configurada
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className={!rule.active ? 'table-secondary' : ''}>
                    <td>
                      {rule.product ? (
                        <div>
                          <span className="badge bg-primary me-2">Produto</span>
                          {rule.product.name}
                        </div>
                      ) : rule.category ? (
                        <div>
                          <span className="badge bg-secondary me-2">Categoria</span>
                          {rule.category.name}
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <code>{rule.guildId}</code>
                    </td>
                    <td>
                      {rule.roleId ? (
                        <div>
                          <code>{rule.roleId}</code>
                          {rule.roleName && (
                            <div className="small text-muted">{rule.roleName}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">Qualquer membro</span>
                      )}
                    </td>
                    <td>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={rule.active}
                          onChange={() => handleToggleActive(rule)}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => handleEdit(rule)}
                          title="Editar"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => handleDelete(rule)}
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
      
      {/* Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingRule ? 'Editar Regra' : 'Nova Regra de Gating'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Aplicar em *</label>
                    <div className="btn-group w-100">
                      <button
                        type="button"
                        className={`btn ${formData.targetType === 'product' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setFormData({ ...formData, targetType: 'product', categoryId: '' })}
                      >
                        Produto
                      </button>
                      <button
                        type="button"
                        className={`btn ${formData.targetType === 'category' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setFormData({ ...formData, targetType: 'category', productId: '' })}
                      >
                        Categoria
                      </button>
                    </div>
                  </div>
                  
                  {formData.targetType === 'product' ? (
                    <div className="mb-3">
                      <label className="form-label">Produto *</label>
                      <select
                        className="form-select"
                        value={formData.productId}
                        onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
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
                  ) : (
                    <div className="mb-3">
                      <label className="form-label">Categoria *</label>
                      <select
                        className="form-select"
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        required
                      >
                        <option value="">Selecione uma categoria</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <hr />
                  
                  <div className="mb-3">
                    <label className="form-label">Guild ID (Servidor Discord) *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.guildId}
                      onChange={(e) => setFormData({ ...formData, guildId: e.target.value })}
                      required
                      placeholder="Ex: 123456789012345678"
                    />
                    <div className="form-text">
                      ID do servidor Discord. Ative o modo desenvolvedor no Discord para copiar.
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Role ID (opcional)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.roleId}
                      onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                      placeholder="Ex: 123456789012345678"
                    />
                    <div className="form-text">
                      Se preenchido, apenas membros com este role poderão acessar.
                      Deixe vazio para permitir qualquer membro do servidor.
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Nome do Role (para exibição)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.roleName}
                      onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                      placeholder="Ex: Premium Member"
                    />
                  </div>
                  
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="active">
                      Regra ativa
                    </label>
                  </div>
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
                    {editingRule ? 'Salvar' : 'Criar Regra'}
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
