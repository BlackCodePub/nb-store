'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';

export default function SecurityPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validação básica
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não conferem.' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/account/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao alterar senha.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita e todos os seus dados serão perdidos.'
    );

    if (!confirmed) return;

    const password = prompt('Digite sua senha para confirmar:');
    if (!password) return;

    try {
      const res = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        alert('Sua conta foi excluída com sucesso.');
        signOut({ callbackUrl: '/' });
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir conta.');
      }
    } catch (err) {
      alert('Erro ao conectar com o servidor.');
    }
  };

  return (
    <div className="row g-4">
      {/* Alterar Senha */}
      <div className="col-12">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0">
              <i className="bi bi-key me-2"></i>
              Alterar Senha
            </h5>
            <small className="text-muted">Atualize sua senha de acesso</small>
          </div>
          <div className="card-body">
            {message && (
              <div
                className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`}
                role="alert"
              >
                <i className={`bi bi-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2`}></i>
                {message.text}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setMessage(null)}
                  aria-label="Fechar"
                ></button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                {/* Senha Atual */}
                <div className="col-md-12">
                  <label htmlFor="currentPassword" className="form-label">
                    Senha atual <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      className="form-control"
                      id="currentPassword"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() =>
                        setShowPasswords((prev) => ({ ...prev, current: !prev.current }))
                      }
                    >
                      <i className={`bi bi-eye${showPasswords.current ? '-slash' : ''}`}></i>
                    </button>
                  </div>
                </div>

                {/* Nova Senha */}
                <div className="col-md-6">
                  <label htmlFor="newPassword" className="form-label">
                    Nova senha <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      className="form-control"
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() =>
                        setShowPasswords((prev) => ({ ...prev, new: !prev.new }))
                      }
                    >
                      <i className={`bi bi-eye${showPasswords.new ? '-slash' : ''}`}></i>
                    </button>
                  </div>
                  <small className="text-muted">Mínimo de 6 caracteres</small>
                </div>

                {/* Confirmar Nova Senha */}
                <div className="col-md-6">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirmar nova senha <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      className="form-control"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() =>
                        setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))
                      }
                    >
                      <i className={`bi bi-eye${showPasswords.confirm ? '-slash' : ''}`}></i>
                    </button>
                  </div>
                </div>
              </div>

              <hr className="my-4" />

              <div className="d-flex justify-content-end">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Alterando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2 me-2"></i>
                      Alterar senha
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Sessões Ativas */}
      <div className="col-12">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0">
              <i className="bi bi-laptop me-2"></i>
              Sessões Ativas
            </h5>
            <small className="text-muted">Gerencie suas sessões em outros dispositivos</small>
          </div>
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center"
                  style={{ width: 40, height: 40 }}
                >
                  <i className="bi bi-check2"></i>
                </div>
                <div>
                  <h6 className="mb-0">Dispositivo atual</h6>
                  <small className="text-muted">Sessão ativa</small>
                </div>
              </div>
              <span className="badge bg-success">Ativo</span>
            </div>

            <div className="mt-3">
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <i className="bi bi-box-arrow-right me-2"></i>
                Sair de todos os dispositivos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Zona de Perigo */}
      <div className="col-12">
        <div className="card border-danger">
          <div className="card-header bg-danger bg-opacity-10 py-3">
            <h5 className="mb-0 text-danger">
              <i className="bi bi-exclamation-triangle me-2"></i>
              Zona de Perigo
            </h5>
          </div>
          <div className="card-body">
            <h6>Excluir conta</h6>
            <p className="text-muted small">
              Ao excluir sua conta, todos os seus dados serão permanentemente removidos. Esta ação não pode
              ser desfeita.
            </p>
            <button className="btn btn-outline-danger" onClick={handleDeleteAccount}>
              <i className="bi bi-trash me-2"></i>
              Excluir minha conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
