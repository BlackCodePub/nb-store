'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  name: string | null;
  email: string;
  cpf: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
  _count?: {
    orders: number;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);
  
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (roleFilter) params.append('role', roleFilter);
      if (search) params.append('search', search);
      
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };
  
  const getRoleBadge = (role: string) => {
    const badges: Record<string, string> = {
      ADMIN: 'bg-danger',
      EDITOR: 'bg-warning text-dark',
      SUPPORT: 'bg-info',
      USER: 'bg-secondary',
    };
    return badges[role] || 'bg-secondary';
  };
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Usuários</h1>
        <Link href="/admin/users/new" className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i>
          Novo Usuário
        </Link>
      </div>
      
      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={handleSearch} className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por nome ou e-mail..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button className="btn btn-outline-secondary" type="submit">
                  <i className="bi bi-search"></i>
                </button>
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              >
                <option value="">Todos os papéis</option>
                <option value="ADMIN">Administrador</option>
                <option value="EDITOR">Editor</option>
                <option value="SUPPORT">Suporte</option>
                <option value="USER">Usuário</option>
              </select>
            </div>
            <div className="col-md-3">
              <button 
                type="button" 
                className="btn btn-outline-secondary w-100"
                onClick={() => { setSearch(''); setRoleFilter(''); setPage(1); }}
              >
                Limpar Filtros
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Tabela */}
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Pedidos</th>
                <th>Cadastro</th>
                <th style={{width: '120px'}}>Ações</th>
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="avatar bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: 32, height: 32 }}>
                          {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-medium">{user.name || 'Sem nome'}</div>
                          {user.phone && <small className="text-muted">{user.phone}</small>}
                        </div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user._count?.orders || 0}</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <Link 
                          href={`/admin/users/${user.id}`}
                          className="btn btn-outline-primary"
                          title="Editar"
                        >
                          <i className="bi bi-pencil"></i>
                        </Link>
                        <Link 
                          href={`/admin/users/${user.id}/orders`}
                          className="btn btn-outline-secondary"
                          title="Ver Pedidos"
                        >
                          <i className="bi bi-bag"></i>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Paginação */}
        {totalPages > 1 && (
          <div className="card-footer d-flex justify-content-between align-items-center">
            <span className="text-muted">
              Página {page} de {totalPages}
            </span>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => Math.max(1, p - 1))}>
                    Anterior
                  </button>
                </li>
                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                    Próxima
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
