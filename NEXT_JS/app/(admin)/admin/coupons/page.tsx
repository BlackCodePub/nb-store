'use client';

import { useState, useEffect } from 'react';

interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSubtotalCents: number | null;
  maxUsesTotal: number | null;
  maxUsesPerUser: number | null;
  usageCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    type: 'percent' as 'percent' | 'fixed',
    value: 0,
    minOrderValue: '',
    maxUsesTotal: '',
    maxUsesPerUser: '',
    startsAt: new Date().toISOString().split('T')[0],
    endsAt: '',
    isActive: true,
  });
  
  useEffect(() => {
    fetchCoupons();
  }, []);
  
  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/coupons');
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingCoupon 
        ? `/api/admin/coupons/${editingCoupon.id}`
        : '/api/admin/coupons';
      
      const res = await fetch(url, {
        method: editingCoupon ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code,
          type: formData.type,
          value: formData.value,
          minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : null,
          maxUsesTotal: formData.maxUsesTotal ? parseInt(formData.maxUsesTotal) : null,
          maxUsesPerUser: formData.maxUsesPerUser ? parseInt(formData.maxUsesPerUser) : null,
          startsAt: formData.startsAt || null,
          endsAt: formData.endsAt || null,
          isActive: formData.isActive,
        }),
      });
      
      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchCoupons();
      }
    } catch (error) {
      console.error('Erro ao salvar cupom:', error);
    }
  };
  
  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minOrderValue: coupon.minSubtotalCents ? (coupon.minSubtotalCents / 100).toString() : '',
      maxUsesTotal: coupon.maxUsesTotal?.toString() || '',
      maxUsesPerUser: coupon.maxUsesPerUser?.toString() || '',
      startsAt: coupon.startsAt?.split('T')[0] || '',
      endsAt: coupon.endsAt?.split('T')[0] || '',
      isActive: coupon.isActive,
    });
    setShowModal(true);
  };
  
  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      fetchCoupons();
    } catch (error) {
      console.error('Erro ao atualizar cupom:', error);
    }
  };
  
  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Tem certeza que deseja excluir o cupom "${coupon.code}"?`)) return;
    
    try {
      await fetch(`/api/admin/coupons/${coupon.id}`, { method: 'DELETE' });
      fetchCoupons();
    } catch (error) {
      console.error('Erro ao excluir cupom:', error);
    }
  };
  
  const resetForm = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      type: 'percent',
      value: 0,
      minOrderValue: '',
      maxUsesTotal: '',
      maxUsesPerUser: '',
      startsAt: new Date().toISOString().split('T')[0],
      endsAt: '',
      isActive: true,
    });
  };
  
  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };
  
  const formatValue = (coupon: Coupon) => {
    if (coupon.type === 'percent') {
      return `${coupon.value}%`;
    }
    // Valor em centavos, converter para reais
    return `R$ ${(coupon.value / 100).toFixed(2)}`;
  };
  
  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };
  
  const isExpired = (coupon: Coupon) => {
    if (!coupon.endsAt) return false;
    return new Date(coupon.endsAt) < new Date();
  };
  
  const isUsageLimitReached = (coupon: Coupon) => {
    if (!coupon.maxUsesTotal) return false;
    return coupon.usageCount >= coupon.maxUsesTotal;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Cupons</h1>
        <button className="btn btn-primary" onClick={openNewModal}>
          <i className="bi bi-plus-lg me-2"></i>
          Novo Cupom
        </button>
      </div>
      
      {/* Tabela */}
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Código</th>
                <th>Desconto</th>
                <th>Uso</th>
                <th>Validade</th>
                <th>Status</th>
                <th style={{width: '150px'}}>Ações</th>
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
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    Nenhum cupom cadastrado
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className={!coupon.isActive ? 'table-secondary' : ''}>
                    <td>
                      <code className="fs-6">{coupon.code}</code>
                      {coupon.minSubtotalCents && (
                        <div className="small text-muted">
                          Mín: R$ {(coupon.minSubtotalCents / 100).toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{formatValue(coupon)}</strong>
                    </td>
                    <td>
                      {coupon.usageCount}
                      {coupon.maxUsesTotal && ` / ${coupon.maxUsesTotal}`}
                      {isUsageLimitReached(coupon) && (
                        <span className="badge bg-warning text-dark ms-2">Esgotado</span>
                      )}
                    </td>
                    <td>
                      <div>{formatDate(coupon.startsAt)}</div>
                      {coupon.endsAt && (
                        <div className="small text-muted">
                          até {formatDate(coupon.endsAt)}
                          {isExpired(coupon) && (
                            <span className="badge bg-danger ms-2">Expirado</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={coupon.isActive}
                          onChange={() => handleToggleActive(coupon)}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button 
                          className="btn btn-outline-primary"
                          onClick={() => handleEdit(coupon)}
                          title="Editar"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button 
                          className="btn btn-outline-danger"
                          onClick={() => handleDelete(coupon)}
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
                    {editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Código *</label>
                    <input
                      type="text"
                      className="form-control text-uppercase"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      required
                      placeholder="Ex: DESCONTO10"
                    />
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-6">
                      <label className="form-label">Tipo *</label>
                      <select
                        className="form-select"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'percent' | 'fixed' })}
                      >
                        <option value="percent">Percentual (%)</option>
                        <option value="fixed">Valor Fixo (centavos)</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label">Valor *</label>
                      <div className="input-group">
                        {formData.type === 'fixed' && <span className="input-group-text">R$</span>}
                        <input
                          type="number"
                          className="form-control"
                          value={formData.value}
                          onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                          required
                          min={0}
                          step={formData.type === 'percent' ? 1 : 0.01}
                        />
                        {formData.type === 'percent' && <span className="input-group-text">%</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-6">
                      <label className="form-label">Valor Mínimo do Pedido</label>
                      <div className="input-group">
                        <span className="input-group-text">R$</span>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.minOrderValue}
                          onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                          min={0}
                          step={0.01}
                        />
                      </div>
                    </div>
                    <div className="col-6">
                      <label className="form-label">Usos por Usuário</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.maxUsesPerUser}
                        onChange={(e) => setFormData({ ...formData, maxUsesPerUser: e.target.value })}
                        min={1}
                        placeholder="Ilimitado"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Limite de Uso Total</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.maxUsesTotal}
                      onChange={(e) => setFormData({ ...formData, maxUsesTotal: e.target.value })}
                      min={1}
                      placeholder="Ilimitado"
                    />
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-6">
                      <label className="form-label">Data de Início</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.startsAt}
                        onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Data de Término</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.endsAt}
                        onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="isActive">
                      Cupom ativo
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
                    {editingCoupon ? 'Salvar' : 'Criar Cupom'}
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
