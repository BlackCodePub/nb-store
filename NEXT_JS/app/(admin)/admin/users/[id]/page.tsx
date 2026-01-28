'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Role {
  id: string;
  name: string;
  level: number;
  isAdmin: boolean;
}

interface UserDetail {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  cpf: string | null;
  createdAt: string;
  roleId: string | null;
  roles: Role[];
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = useMemo(() => (params?.id as string) || '', [params]);

  const [user, setUser] = useState<UserDetail | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [userRes, rolesRes] = await Promise.all([
          fetch(`/api/admin/users/${userId}`),
          fetch('/api/admin/roles'),
        ]);

        if (!userRes.ok) {
          const data = await userRes.json().catch(() => null);
          throw new Error(data?.error || 'Erro ao carregar usuário');
        }

        const userData = await userRes.json();
        const userInfo: UserDetail = userData.user;
        setUser(userInfo);
        setName(userInfo.name || '');
        setRoleId(userInfo.roleId || '');

        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          setRoles(rolesData.roles || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar usuário');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: name.trim() || null,
          roleId: roleId || null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao salvar usuário');
      }

      setSuccess('Usuário atualizado com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar usuário');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="alert alert-danger">Usuário não encontrado.</div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Editar usuário</h1>
          <div className="text-muted small">{user.email}</div>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => router.back()}
            type="button"
          >
            Voltar
          </button>
          <Link href="/admin/users" className="btn btn-outline-primary">
            Lista de usuários
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSave} className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Nome</label>
              <input
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">E-mail</label>
              <input
                className="form-control"
                value={user.email}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Telefone</label>
              <input className="form-control" value={user.phone || ''} readOnly />
            </div>
            <div className="col-md-6">
              <label className="form-label">CPF</label>
              <input className="form-control" value={user.cpf || ''} readOnly />
            </div>
            <div className="col-md-6">
              <label className="form-label">Papel</label>
              <select
                className="form-select"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
              >
                <option value="">Sem papel</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              {!roles.length && (
                <small className="text-muted">Não foi possível carregar os papéis.</small>
              )}
            </div>
            <div className="col-md-6">
              <label className="form-label">Cadastro</label>
              <input
                className="form-control"
                value={new Date(user.createdAt).toLocaleDateString('pt-BR')}
                readOnly
              />
            </div>

            {error && (
              <div className="col-12">
                <div className="alert alert-danger mb-0">{error}</div>
              </div>
            )}
            {success && (
              <div className="col-12">
                <div className="alert alert-success mb-0">{success}</div>
              </div>
            )}

            <div className="col-12 d-flex justify-content-end">
              <button className="btn btn-primary" disabled={saving} type="submit">
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
