'use client';

import { useState, useEffect } from 'react';

interface Subscription {
  id: string;
  email: string;
  active: boolean;
  createdAt: string;
}

export default function AdminNewsletterPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const res = await fetch('/api/admin/newsletter');
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (sub: Subscription) => {
    try {
      const res = await fetch(`/api/admin/newsletter/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !sub.active }),
      });
      if (res.ok) {
        await loadSubscriptions();
      }
    } catch (error) {
      alert('Erro ao atualizar inscrição');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta inscrição?')) return;

    try {
      const res = await fetch(`/api/admin/newsletter/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadSubscriptions();
      }
    } catch (error) {
      alert('Erro ao excluir inscrição');
    }
  };

  const exportCSV = () => {
    const filtered = getFilteredSubscriptions();
    const csv = [
      'Email,Status,Data de Cadastro',
      ...filtered.map(s => 
        `${s.email},${s.active ? 'Ativo' : 'Inativo'},${new Date(s.createdAt).toLocaleDateString('pt-BR')}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const getFilteredSubscriptions = () => {
    return subscriptions.filter(sub => {
      const matchesFilter = 
        filter === 'all' || 
        (filter === 'active' && sub.active) || 
        (filter === 'inactive' && !sub.active);
      
      const matchesSearch = 
        !searchTerm || 
        sub.email.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  };

  const filtered = getFilteredSubscriptions();
  const activeCount = subscriptions.filter(s => s.active).length;
  const inactiveCount = subscriptions.filter(s => !s.active).length;

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
            <i className="bi bi-envelope me-2"></i>
            Newsletter
          </h1>
          <p className="text-muted mb-0">Gerencie os inscritos na newsletter</p>
        </div>
        <button onClick={exportCSV} className="btn btn-outline-primary">
          <i className="bi bi-download me-2"></i>
          Exportar CSV
        </button>
      </div>

      {/* Estatísticas */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="small opacity-75">Total de Inscritos</div>
                  <div className="h3 mb-0">{subscriptions.length}</div>
                </div>
                <i className="bi bi-people" style={{ fontSize: '2rem', opacity: 0.5 }}></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm bg-success text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="small opacity-75">Ativos</div>
                  <div className="h3 mb-0">{activeCount}</div>
                </div>
                <i className="bi bi-check-circle" style={{ fontSize: '2rem', opacity: 0.5 }}></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm bg-secondary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="small opacity-75">Inativos</div>
                  <div className="h3 mb-0">{inactiveCount}</div>
                </div>
                <i className="bi bi-x-circle" style={{ fontSize: '2rem', opacity: 0.5 }}></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="btn-group w-100">
                <button
                  className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setFilter('all')}
                >
                  Todos ({subscriptions.length})
                </button>
                <button
                  className={`btn ${filter === 'active' ? 'btn-success' : 'btn-outline-success'}`}
                  onClick={() => setFilter('active')}
                >
                  Ativos ({activeCount})
                </button>
                <button
                  className={`btn ${filter === 'inactive' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                  onClick={() => setFilter('inactive')}
                >
                  Inativos ({inactiveCount})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="card border-0 shadow-sm">
        {filtered.length === 0 ? (
          <div className="card-body text-center py-5">
            <i className="bi bi-envelope text-muted mb-3" style={{ fontSize: '3rem' }}></i>
            <h5>Nenhuma inscrição encontrada</h5>
            <p className="text-muted">
              {searchTerm ? 'Tente uma busca diferente.' : 'Nenhum e-mail cadastrado ainda.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>E-mail</th>
                  <th>Status</th>
                  <th>Data de Cadastro</th>
                  <th style={{ width: 120 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <i className="bi bi-envelope me-2 text-muted"></i>
                      {sub.email}
                    </td>
                    <td>
                      <span className={`badge ${sub.active ? 'bg-success' : 'bg-secondary'}`}>
                        {sub.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="text-muted">
                      {new Date(sub.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleActive(sub)}
                        className={`btn btn-sm ${sub.active ? 'btn-outline-secondary' : 'btn-outline-success'} me-1`}
                        title={sub.active ? 'Desativar' : 'Ativar'}
                      >
                        <i className={`bi ${sub.active ? 'bi-pause' : 'bi-play'}`}></i>
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        className="btn btn-sm btn-outline-danger"
                        title="Excluir"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
