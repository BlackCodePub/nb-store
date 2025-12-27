'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: string;
  locale: string;
  currency: string;
}

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    birthDate: '',
    locale: 'pt-BR',
    currency: 'BRL',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/account/profile');
      if (res.ok) {
        const data = await res.json();
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          cpf: data.cpf || '',
          birthDate: data.birthDate || '',
          locale: data.locale || 'pt-BR',
          currency: data.currency || 'BRL',
        });
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        // Atualiza a sessão com o novo nome
        if (formData.name !== session?.user?.name) {
          await update({ name: formData.name });
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao atualizar perfil.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor.' });
    } finally {
      setSaving(false);
    }
  };

  // Máscara de telefone
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  // Máscara de CPF
  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  if (loading) {
    return (
      <div className="card border-0 shadow-sm">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white py-3">
        <h5 className="mb-0">Dados Pessoais</h5>
        <small className="text-muted">Atualize suas informações pessoais</small>
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
            {/* Nome */}
            <div className="col-md-6">
              <label htmlFor="name" className="form-label">
                Nome completo <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Seu nome completo"
              />
            </div>

            {/* Email */}
            <div className="col-md-6">
              <label htmlFor="email" className="form-label">
                E-mail
              </label>
              <input
                type="email"
                className="form-control"
                id="email"
                name="email"
                value={formData.email}
                disabled
                readOnly
              />
              <small className="text-muted">O e-mail não pode ser alterado.</small>
            </div>

            {/* Telefone */}
            <div className="col-md-6">
              <label htmlFor="phone" className="form-label">
                Telefone
              </label>
              <input
                type="tel"
                className="form-control"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value);
                  setFormData((prev) => ({ ...prev, phone: formatted }));
                }}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            {/* CPF */}
            <div className="col-md-6">
              <label htmlFor="cpf" className="form-label">
                CPF
              </label>
              <input
                type="text"
                className="form-control"
                id="cpf"
                name="cpf"
                value={formData.cpf}
                onChange={(e) => {
                  const formatted = formatCPF(e.target.value);
                  setFormData((prev) => ({ ...prev, cpf: formatted }));
                }}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            {/* Data de Nascimento */}
            <div className="col-md-6">
              <label htmlFor="birthDate" className="form-label">
                Data de Nascimento
              </label>
              <input
                type="date"
                className="form-control"
                id="birthDate"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Preferências */}
          <div className="mt-4 pt-3 border-top">
            <h6 className="text-muted mb-3">
              <i className="bi bi-gear me-2"></i>
              Preferências
            </h6>
            <div className="row g-3">
              {/* Idioma */}
              <div className="col-md-6">
                <label htmlFor="locale" className="form-label">
                  <i className="bi bi-translate me-1"></i>
                  Idioma preferido
                </label>
                <select
                  className="form-select"
                  id="locale"
                  name="locale"
                  value={formData.locale}
                  onChange={handleChange}
                >
                  <option value="pt-BR">🇧🇷 Português (Brasil)</option>
                  <option value="en-US">🇺🇸 English (US)</option>
                </select>
                <small className="text-muted">
                  Idioma usado para exibição de conteúdo na loja.
                </small>
              </div>

              {/* Moeda */}
              <div className="col-md-6">
                <label htmlFor="currency" className="form-label">
                  <i className="bi bi-currency-exchange me-1"></i>
                  Moeda preferida
                </label>
                <select
                  className="form-select"
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                >
                  <option value="BRL">R$ Real Brasileiro (BRL)</option>
                  <option value="USD">$ US Dollar (USD)</option>
                </select>
                <small className="text-muted">
                  Moeda usada para exibição de preços. Pagamento sempre em BRL.
                </small>
              </div>
            </div>
          </div>

          <hr className="my-4" />

          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={fetchProfile}
              disabled={saving}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Salvando...
                </>
              ) : (
                <>
                  <i className="bi bi-check2 me-2"></i>
                  Salvar alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
