'use client';

import { useState, useEffect } from 'react';

interface Address {
  id: string;
  name: string;
  phone: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  isDefault: boolean;
}

const emptyAddress: Omit<Address, 'id'> = {
  name: '',
  phone: '',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  isDefault: false,
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Address, 'id'>>(emptyAddress);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const res = await fetch('/api/account/addresses');
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
      }
    } catch (err) {
      console.error('Erro ao carregar endereços:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const searchCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData((prev) => ({
          ...prev,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        }));
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
    } finally {
      setLoadingCep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const url = editingId ? `/api/account/addresses/${editingId}` : '/api/account/addresses';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setMessage({
          type: 'success',
          text: editingId ? 'Endereço atualizado com sucesso!' : 'Endereço adicionado com sucesso!',
        });
        setShowForm(false);
        setEditingId(null);
        setFormData(emptyAddress);
        fetchAddresses();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar endereço.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor.' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (address: Address) => {
    setFormData({
      name: address.name,
      phone: address.phone,
      zipCode: address.zipCode,
      street: address.street,
      number: address.number,
      complement: address.complement,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      isDefault: address.isDefault,
    });
    setEditingId(address.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este endereço?')) return;

    try {
      const res = await fetch(`/api/account/addresses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Endereço excluído com sucesso!' });
        fetchAddresses();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Erro ao excluir endereço.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor.' });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/account/addresses/${id}/default`, { method: 'PUT' });
      if (res.ok) {
        fetchAddresses();
      }
    } catch (err) {
      console.error('Erro ao definir padrão:', err);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyAddress);
  };

  // Formatar CEP
  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  // Formatar telefone
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  // Estados brasileiros
  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
  ];

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
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">Meus Endereços</h5>
          <small className="text-muted">Gerencie seus endereços de entrega</small>
        </div>
        {!showForm && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            <i className="bi bi-plus-lg me-1"></i>
            Novo Endereço
          </button>
        )}
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

        {showForm ? (
          <form onSubmit={handleSubmit}>
            <h6 className="mb-3">{editingId ? 'Editar Endereço' : 'Novo Endereço'}</h6>
            <div className="row g-3">
              {/* Nome */}
              <div className="col-md-6">
                <label htmlFor="name" className="form-label">
                  Nome do destinatário <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Telefone */}
              <div className="col-md-6">
                <label htmlFor="phone" className="form-label">
                  Telefone <span className="text-danger">*</span>
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
                  required
                  maxLength={15}
                />
              </div>

              {/* CEP */}
              <div className="col-md-4">
                <label htmlFor="zipCode" className="form-label">
                  CEP <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => {
                      const formatted = formatCep(e.target.value);
                      setFormData((prev) => ({ ...prev, zipCode: formatted }));
                      if (formatted.replace(/\D/g, '').length === 8) {
                        searchCep(formatted);
                      }
                    }}
                    required
                    maxLength={9}
                  />
                  {loadingCep && (
                    <span className="input-group-text">
                      <span className="spinner-border spinner-border-sm"></span>
                    </span>
                  )}
                </div>
              </div>

              {/* Rua */}
              <div className="col-md-8">
                <label htmlFor="street" className="form-label">
                  Rua <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="street"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Número */}
              <div className="col-md-3">
                <label htmlFor="number" className="form-label">
                  Número <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="number"
                  name="number"
                  value={formData.number}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Complemento */}
              <div className="col-md-5">
                <label htmlFor="complement" className="form-label">
                  Complemento
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="complement"
                  name="complement"
                  value={formData.complement}
                  onChange={handleChange}
                  placeholder="Apto, bloco, etc."
                />
              </div>

              {/* Bairro */}
              <div className="col-md-4">
                <label htmlFor="neighborhood" className="form-label">
                  Bairro <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="neighborhood"
                  name="neighborhood"
                  value={formData.neighborhood}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Cidade */}
              <div className="col-md-6">
                <label htmlFor="city" className="form-label">
                  Cidade <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Estado */}
              <div className="col-md-3">
                <label htmlFor="state" className="form-label">
                  Estado <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecione</option>
                  {estados.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>

              {/* Endereço padrão */}
              <div className="col-12">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="isDefault"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleChange}
                  />
                  <label className="form-check-label" htmlFor="isDefault">
                    Definir como endereço padrão
                  </label>
                </div>
              </div>
            </div>

            <hr className="my-4" />

            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={cancelForm} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2 me-2"></i>
                    {editingId ? 'Atualizar' : 'Adicionar'}
                  </>
                )}
              </button>
            </div>
          </form>
        ) : addresses.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-geo-alt display-1 text-muted"></i>
            <h5 className="mt-4">Nenhum endereço cadastrado</h5>
            <p className="text-muted">Adicione um endereço para facilitar suas compras.</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <i className="bi bi-plus-lg me-2"></i>
              Adicionar endereço
            </button>
          </div>
        ) : (
          <div className="row g-3">
            {addresses.map((address) => (
              <div className="col-md-6" key={address.id}>
                <div className={`card h-100 ${address.isDefault ? 'border-primary' : ''}`}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="mb-0">{address.name}</h6>
                      {address.isDefault && (
                        <span className="badge bg-primary">Padrão</span>
                      )}
                    </div>
                    <p className="small text-muted mb-2">
                      {address.street}, {address.number}
                      {address.complement && ` - ${address.complement}`}
                      <br />
                      {address.neighborhood} - {address.city}/{address.state}
                      <br />
                      CEP: {address.zipCode}
                    </p>
                    <p className="small mb-0">
                      <i className="bi bi-telephone me-1"></i>
                      {address.phone}
                    </p>
                  </div>
                  <div className="card-footer bg-white border-top-0 pt-0">
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleEdit(address)}
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(address.id)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                      {!address.isDefault && (
                        <button
                          className="btn btn-sm btn-outline-secondary ms-auto"
                          onClick={() => handleSetDefault(address.id)}
                        >
                          Definir padrão
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
