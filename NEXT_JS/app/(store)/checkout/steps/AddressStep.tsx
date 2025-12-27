'use client';

import { useState, useEffect } from 'react';

interface AddressData {
  name: string;
  phone: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface Props {
  data: AddressData | null;
  onSave: (data: AddressData) => void;
}

// Formatar CEP com máscara
function formatCep(value: string): string {
  return value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);
}

// Formatar telefone com máscara
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').slice(0, 15);
}

export function AddressStep({ data, onSave }: Props) {
  const [form, setForm] = useState<AddressData>({
    name: data?.name || '',
    phone: data?.phone || '',
    zipCode: data?.zipCode || '',
    street: data?.street || '',
    number: data?.number || '',
    complement: data?.complement || '',
    neighborhood: data?.neighborhood || '',
    city: data?.city || '',
    state: data?.state || '',
  });
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Buscar endereço pelo CEP (ViaCEP)
  const fetchAddress = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    setCepError('');

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();

      if (data.erro) {
        setCepError('CEP não encontrado');
        return;
      }

      setForm((prev) => ({
        ...prev,
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
      }));
    } catch {
      setCepError('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  // Auto-buscar quando CEP completo
  useEffect(() => {
    const cleanCep = form.zipCode.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      fetchAddress(cleanCep);
    }
  }, [form.zipCode]);

  // Atualizar campo
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'zipCode') {
      formattedValue = formatCep(value);
    } else if (name === 'phone') {
      formattedValue = formatPhone(value);
    }

    setForm((prev) => ({ ...prev, [name]: formattedValue }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // Validar formulário
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!form.phone || form.phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = 'Telefone inválido';
    }
    if (!form.zipCode || form.zipCode.replace(/\D/g, '').length !== 8) {
      newErrors.zipCode = 'CEP inválido';
    }
    if (!form.street.trim()) newErrors.street = 'Rua é obrigatória';
    if (!form.number.trim()) newErrors.number = 'Número é obrigatório';
    if (!form.neighborhood.trim()) newErrors.neighborhood = 'Bairro é obrigatório';
    if (!form.city.trim()) newErrors.city = 'Cidade é obrigatória';
    if (!form.state) newErrors.state = 'Estado é obrigatório';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submeter
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(form);
    }
  };

  const states = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
  ];

  return (
    <form onSubmit={handleSubmit}>
      <h5 className="mb-4">Endereço de Entrega</h5>

      <div className="row g-3">
        {/* Nome Completo */}
        <div className="col-md-6">
          <label htmlFor="name" className="form-label">
            Nome Completo <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            className={`form-control ${errors.name ? 'is-invalid' : ''}`}
            value={form.name}
            onChange={handleChange}
            placeholder="Seu nome completo"
          />
          {errors.name && <div className="invalid-feedback">{errors.name}</div>}
        </div>

        {/* Telefone */}
        <div className="col-md-6">
          <label htmlFor="phone" className="form-label">
            Telefone <span className="text-danger">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
            value={form.phone}
            onChange={handleChange}
            placeholder="(00) 00000-0000"
          />
          {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
        </div>

        {/* CEP */}
        <div className="col-md-4">
          <label htmlFor="zipCode" className="form-label">
            CEP <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <input
              type="text"
              id="zipCode"
              name="zipCode"
              className={`form-control ${errors.zipCode || cepError ? 'is-invalid' : ''}`}
              value={form.zipCode}
              onChange={handleChange}
              placeholder="00000-000"
            />
            {loadingCep && (
              <span className="input-group-text">
                <span className="spinner-border spinner-border-sm" />
              </span>
            )}
            {(errors.zipCode || cepError) && (
              <div className="invalid-feedback">{errors.zipCode || cepError}</div>
            )}
          </div>
          <small className="text-muted">
            <a
              href="https://buscacepinter.correios.com.br/app/endereco/index.php"
              target="_blank"
              rel="noopener noreferrer"
            >
              Não sei meu CEP
            </a>
          </small>
        </div>

        {/* Rua */}
        <div className="col-md-8">
          <label htmlFor="street" className="form-label">
            Rua / Logradouro <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            id="street"
            name="street"
            className={`form-control ${errors.street ? 'is-invalid' : ''}`}
            value={form.street}
            onChange={handleChange}
            placeholder="Nome da rua"
          />
          {errors.street && <div className="invalid-feedback">{errors.street}</div>}
        </div>

        {/* Número */}
        <div className="col-md-3">
          <label htmlFor="number" className="form-label">
            Número <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            id="number"
            name="number"
            className={`form-control ${errors.number ? 'is-invalid' : ''}`}
            value={form.number}
            onChange={handleChange}
            placeholder="Nº"
          />
          {errors.number && <div className="invalid-feedback">{errors.number}</div>}
        </div>

        {/* Complemento */}
        <div className="col-md-4">
          <label htmlFor="complement" className="form-label">
            Complemento
          </label>
          <input
            type="text"
            id="complement"
            name="complement"
            className="form-control"
            value={form.complement}
            onChange={handleChange}
            placeholder="Apto, Bloco, etc."
          />
        </div>

        {/* Bairro */}
        <div className="col-md-5">
          <label htmlFor="neighborhood" className="form-label">
            Bairro <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            id="neighborhood"
            name="neighborhood"
            className={`form-control ${errors.neighborhood ? 'is-invalid' : ''}`}
            value={form.neighborhood}
            onChange={handleChange}
            placeholder="Nome do bairro"
          />
          {errors.neighborhood && <div className="invalid-feedback">{errors.neighborhood}</div>}
        </div>

        {/* Cidade */}
        <div className="col-md-7">
          <label htmlFor="city" className="form-label">
            Cidade <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            id="city"
            name="city"
            className={`form-control ${errors.city ? 'is-invalid' : ''}`}
            value={form.city}
            onChange={handleChange}
            placeholder="Nome da cidade"
          />
          {errors.city && <div className="invalid-feedback">{errors.city}</div>}
        </div>

        {/* Estado */}
        <div className="col-md-5">
          <label htmlFor="state" className="form-label">
            Estado <span className="text-danger">*</span>
          </label>
          <select
            id="state"
            name="state"
            className={`form-select ${errors.state ? 'is-invalid' : ''}`}
            value={form.state}
            onChange={handleChange}
          >
            <option value="">Selecione...</option>
            {states.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
          {errors.state && <div className="invalid-feedback">{errors.state}</div>}
        </div>
      </div>

      <div className="mt-4 d-flex justify-content-end">
        <button type="submit" className="btn btn-primary px-4">
          Continuar para Frete
          <svg className="ms-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>
    </form>
  );
}
