'use client';

import { useState, useEffect } from 'react';

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  userCount: number;
  createdAt: string;
}

const ALL_PERMISSIONS = [
  { key: 'dashboard.view', label: 'Ver Dashboard', group: 'Dashboard' },
  { key: 'products.view', label: 'Ver Produtos', group: 'Catálogo' },
  { key: 'products.create', label: 'Criar Produtos', group: 'Catálogo' },
  { key: 'products.edit', label: 'Editar Produtos', group: 'Catálogo' },
  { key: 'products.delete', label: 'Excluir Produtos', group: 'Catálogo' },
  { key: 'categories.view', label: 'Ver Categorias', group: 'Catálogo' },
  { key: 'categories.create', label: 'Criar Categorias', group: 'Catálogo' },
  { key: 'categories.edit', label: 'Editar Categorias', group: 'Catálogo' },
  { key: 'categories.delete', label: 'Excluir Categorias', group: 'Catálogo' },
  { key: 'orders.view', label: 'Ver Pedidos', group: 'Pedidos' },
  { key: 'orders.update', label: 'Atualizar Pedidos', group: 'Pedidos' },
  { key: 'orders.cancel', label: 'Cancelar Pedidos', group: 'Pedidos' },
  { key: 'users.view', label: 'Ver Usuários', group: 'Usuários' },
  { key: 'users.edit', label: 'Editar Usuários', group: 'Usuários' },
  { key: 'users.delete', label: 'Excluir Usuários', group: 'Usuários' },
  { key: 'coupons.view', label: 'Ver Cupons', group: 'Marketing' },
  { key: 'coupons.create', label: 'Criar Cupons', group: 'Marketing' },
  { key: 'coupons.edit', label: 'Editar Cupons', group: 'Marketing' },
  { key: 'coupons.delete', label: 'Excluir Cupons', group: 'Marketing' },
  { key: 'content.view', label: 'Ver Conteúdo', group: 'Conteúdo' },
  { key: 'content.create', label: 'Criar Posts', group: 'Conteúdo' },
  { key: 'content.edit', label: 'Editar Posts', group: 'Conteúdo' },
  { key: 'content.delete', label: 'Excluir Posts', group: 'Conteúdo' },
  { key: 'comments.moderate', label: 'Moderar Comentários', group: 'Conteúdo' },
  { key: 'settings.view', label: 'Ver Configurações', group: 'Sistema' },
  { key: 'settings.edit', label: 'Editar Configurações', group: 'Sistema' },
  { key: 'roles.view', label: 'Ver Roles', group: 'Sistema' },
  { key: 'roles.edit', label: 'Editar Roles', group: 'Sistema' },
];

const DEFAULT_ROLES = [
  { name: 'ADMIN', label: 'Administrador', description: 'Acesso total ao sistema' },
  { name: 'EDITOR', label: 'Editor', description: 'Gerenciamento de conteúdo e produtos' },
  { name: 'SUPPORT', label: 'Suporte', description: 'Visualização e suporte a pedidos' },
  { name: 'USER', label: 'Usuário', description: 'Acesso básico (clientes)' },
];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });
  
  useEffect(() => {
    fetchRoles();
  }, []);
  
  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      setRoles(data.roles || []);
    } catch (error) {
      console.error('Erro ao carregar roles:', error);
      // Usar roles padrão se API não existir ainda
      setRoles(DEFAULT_ROLES.map((r, i) => ({
        id: `role_${i}`,
        name: r.name,
        description: r.description,
        permissions: r.name === 'ADMIN' ? ALL_PERMISSIONS.map(p => p.key) : [],
        userCount: 0,
        createdAt: new Date().toISOString(),
      })));
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingRole
        ? `/api/admin/roles/${editingRole.id}`
        : '/api/admin/roles';
      
      const res = await fetch(url, {
        method: editingRole ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchRoles();
      }
    } catch (error) {
      console.error('Erro ao salvar role:', error);
    }
  };
  
  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || [],
    });
    setShowModal(true);
  };
  
  const handleDelete = async (role: Role) => {
    if (role.userCount > 0) {
      alert('Não é possível excluir um role que está sendo usado por usuários.');
      return;
    }
    
    if (!confirm('Tem certeza que deseja excluir este role?')) return;
    
    try {
      await fetch(`/api/admin/roles/${role.id}`, { method: 'DELETE' });
      fetchRoles();
    } catch (error) {
      console.error('Erro ao excluir role:', error);
    }
  };
  
  const resetForm = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      permissions: [],
    });
  };
  
  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };
  
  const togglePermission = (key: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key],
    }));
  };
  
  const toggleGroup = (group: string) => {
    const groupPermissions = ALL_PERMISSIONS.filter(p => p.group === group).map(p => p.key);
    const allSelected = groupPermissions.every(p => formData.permissions.includes(p));
    
    setFormData(prev => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter(p => !groupPermissions.includes(p))
        : [...new Set([...prev.permissions, ...groupPermissions])],
    }));
  };
  
  const groups = [...new Set(ALL_PERMISSIONS.map(p => p.group))];
  
  const getRoleBadgeClass = (name: string) => {
    switch (name) {
      case 'ADMIN': return 'bg-danger';
      case 'EDITOR': return 'bg-warning text-dark';
      case 'SUPPORT': return 'bg-info';
      default: return 'bg-secondary';
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">
          <i className="bi bi-shield-lock me-2"></i>
          Roles e Permissões
        </h1>
        <button className="btn btn-primary" onClick={openNewModal}>
          <i className="bi bi-plus-lg me-2"></i>
          Novo Role
        </button>
      </div>
      
      {/* Cards de Roles */}
      <div className="row g-4">
        {loading ? (
          <div className="col-12 text-center py-5">
            <div className="spinner-border me-2"></div>
            Carregando...
          </div>
        ) : (
          roles.map((role) => (
            <div key={role.id} className="col-md-6 col-lg-4">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <span className={`badge ${getRoleBadgeClass(role.name)}`}>
                    {role.name}
                  </span>
                  <div className="btn-group btn-group-sm">
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => handleEdit(role)}
                      title="Editar"
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    {!['ADMIN', 'USER'].includes(role.name) && (
                      <button
                        className="btn btn-outline-danger"
                        onClick={() => handleDelete(role)}
                        title="Excluir"
                        disabled={role.userCount > 0}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  <p className="text-muted small mb-3">
                    {role.description || 'Sem descrição'}
                  </p>
                  
                  <div className="mb-3">
                    <strong className="small">Usuários:</strong>
                    <span className="ms-2 badge bg-secondary">{role.userCount}</span>
                  </div>
                  
                  <div>
                    <strong className="small d-block mb-2">Permissões:</strong>
                    <div style={{ maxHeight: '150px', overflow: 'auto' }}>
                      {role.permissions.length === ALL_PERMISSIONS.length ? (
                        <span className="badge bg-success">
                          <i className="bi bi-check-circle me-1"></i>
                          Acesso Total
                        </span>
                      ) : role.permissions.length === 0 ? (
                        <span className="text-muted small">Nenhuma permissão</span>
                      ) : (
                        <div className="d-flex flex-wrap gap-1">
                          {role.permissions.slice(0, 5).map((perm) => {
                            const permInfo = ALL_PERMISSIONS.find(p => p.key === perm);
                            return (
                              <span key={perm} className="badge bg-light text-dark border">
                                {permInfo?.label || perm}
                              </span>
                            );
                          })}
                          {role.permissions.length > 5 && (
                            <span className="badge bg-primary">
                              +{role.permissions.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingRole ? 'Editar Role' : 'Novo Role'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label">Nome do Role *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                        required
                        placeholder="Ex: MANAGER"
                        disabled={editingRole && ['ADMIN', 'USER'].includes(editingRole.name)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Descrição</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descrição do role"
                      />
                    </div>
                  </div>
                  
                  <h6 className="mb-3">
                    <i className="bi bi-key me-2"></i>
                    Permissões
                  </h6>
                  
                  <div className="row g-3">
                    {groups.map((group) => {
                      const groupPerms = ALL_PERMISSIONS.filter(p => p.group === group);
                      const allSelected = groupPerms.every(p => formData.permissions.includes(p.key));
                      const someSelected = groupPerms.some(p => formData.permissions.includes(p.key));
                      
                      return (
                        <div key={group} className="col-md-6 col-lg-4">
                          <div className="card h-100">
                            <div className="card-header py-2">
                              <div className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`group-${group}`}
                                  checked={allSelected}
                                  ref={(el) => {
                                    if (el) el.indeterminate = someSelected && !allSelected;
                                  }}
                                  onChange={() => toggleGroup(group)}
                                />
                                <label className="form-check-label fw-semibold" htmlFor={`group-${group}`}>
                                  {group}
                                </label>
                              </div>
                            </div>
                            <div className="card-body py-2">
                              {groupPerms.map((perm) => (
                                <div key={perm.key} className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={perm.key}
                                    checked={formData.permissions.includes(perm.key)}
                                    onChange={() => togglePermission(perm.key)}
                                  />
                                  <label className="form-check-label small" htmlFor={perm.key}>
                                    {perm.label}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                    {editingRole ? 'Salvar' : 'Criar Role'}
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
