'use client';

import { useState, useMemo } from 'react';

interface PaymentData {
  method: string;
  installments: number;
}

interface Props {
  total: number;
  data: PaymentData | null;
  onSave: (data: PaymentData) => void;
  onBack: () => void;
}

// Formatar preço em BRL
function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

interface InstallmentOption {
  number: number;
  value: number;
  total: number;
  hasInterest: boolean;
}

export function PaymentStep({ total, data, onSave, onBack }: Props) {
  const [method, setMethod] = useState<string>(data?.method || 'credit_card');
  const [installments, setInstallments] = useState<number>(data?.installments || 1);
  const [error, setError] = useState('');

  // Calcular opções de parcelamento
  const installmentOptions = useMemo((): InstallmentOption[] => {
    const options: InstallmentOption[] = [];
    const interestRate = 0.0199; // 1.99% ao mês
    const freeInstallments = 3; // Parcelas sem juros

    for (let i = 1; i <= 12; i++) {
      if (total / i < 10) continue; // Mínimo de R$ 10 por parcela

      if (i <= freeInstallments) {
        options.push({
          number: i,
          value: total / i,
          total: total,
          hasInterest: false,
        });
      } else {
        // Juros compostos
        const totalWithInterest = total * Math.pow(1 + interestRate, i);
        options.push({
          number: i,
          value: totalWithInterest / i,
          total: totalWithInterest,
          hasInterest: true,
        });
      }
    }

    return options;
  }, [total]);

  // Ao mudar método, resetar parcelas se não for cartão
  const handleMethodChange = (newMethod: string) => {
    setMethod(newMethod);
    if (newMethod !== 'credit_card') {
      setInstallments(1);
    }
  };

  // Submeter
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!method) {
      setError('Selecione uma forma de pagamento');
      return;
    }

    onSave({ method, installments });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h5 className="mb-4">Forma de Pagamento</h5>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="d-flex flex-column gap-3 mb-4">
        {/* Cartão de Crédito */}
        <label
          className={`card ${method === 'credit_card' ? 'border-primary bg-primary bg-opacity-10' : ''}`}
          style={{ cursor: 'pointer' }}
        >
          <div className="card-body p-3">
            <div className="form-check d-flex align-items-start m-0">
              <input
                type="radio"
                name="method"
                className="form-check-input mt-1 me-3"
                checked={method === 'credit_card'}
                onChange={() => handleMethodChange('credit_card')}
              />
              <div className="flex-grow-1">
                <div className="d-flex align-items-center mb-1">
                  <svg className="me-2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  <strong>Cartão de Crédito</strong>
                </div>
                <small className="text-muted">
                  Parcele em até 12x • Até 3x sem juros
                </small>
              </div>
            </div>
          </div>
        </label>

        {/* Seleção de Parcelas */}
        {method === 'credit_card' && (
          <div className="ms-4 ps-3 border-start border-2 border-primary">
            <label className="form-label fw-semibold">Número de Parcelas</label>
            <select
              className="form-select"
              value={installments}
              onChange={(e) => setInstallments(Number(e.target.value))}
            >
              {installmentOptions.map((opt) => (
                <option key={opt.number} value={opt.number}>
                  {opt.number}x de {formatPrice(opt.value)}
                  {opt.hasInterest
                    ? ` (total: ${formatPrice(opt.total)})`
                    : ' sem juros'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* PIX */}
        <label
          className={`card ${method === 'pix' ? 'border-primary bg-primary bg-opacity-10' : ''}`}
          style={{ cursor: 'pointer' }}
        >
          <div className="card-body p-3">
            <div className="form-check d-flex align-items-start m-0">
              <input
                type="radio"
                name="method"
                className="form-check-input mt-1 me-3"
                checked={method === 'pix'}
                onChange={() => handleMethodChange('pix')}
              />
              <div className="flex-grow-1">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <div className="d-flex align-items-center">
                    <svg className="me-2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5"/>
                      <path d="M2 12l10 5 10-5"/>
                    </svg>
                    <strong>PIX</strong>
                  </div>
                  <span className="badge bg-success">5% OFF</span>
                </div>
                <small className="text-muted">
                  Pagamento instantâneo • Aprovação imediata
                </small>
                <div className="mt-1">
                  <span className="text-success fw-semibold">
                    {formatPrice(total * 0.95)}
                  </span>
                  <small className="text-decoration-line-through text-muted ms-2">
                    {formatPrice(total)}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </label>

        {/* Boleto */}
        <label
          className={`card ${method === 'boleto' ? 'border-primary bg-primary bg-opacity-10' : ''}`}
          style={{ cursor: 'pointer' }}
        >
          <div className="card-body p-3">
            <div className="form-check d-flex align-items-start m-0">
              <input
                type="radio"
                name="method"
                className="form-check-input mt-1 me-3"
                checked={method === 'boleto'}
                onChange={() => handleMethodChange('boleto')}
              />
              <div className="flex-grow-1">
                <div className="d-flex align-items-center mb-1">
                  <svg className="me-2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <strong>Boleto Bancário</strong>
                </div>
                <small className="text-muted">
                  Vencimento em 3 dias úteis • Aprovação em até 2 dias
                </small>
              </div>
            </div>
          </div>
        </label>
      </div>

      {/* Bandeiras aceitas */}
      {method === 'credit_card' && (
        <div className="mb-4">
          <small className="text-muted d-block mb-2">Bandeiras aceitas:</small>
          <div className="d-flex gap-2 flex-wrap">
            {['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard'].map((brand) => (
              <span key={brand} className="badge bg-light text-dark border">
                {brand}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Segurança */}
      <div className="alert alert-light d-flex align-items-start border">
        <svg className="me-2 flex-shrink-0 text-success" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <polyline points="9 12 11 14 15 10"/>
        </svg>
        <small>
          <strong className="d-block">Compra 100% Segura</strong>
          Seus dados são criptografados e protegidos. 
          Processamento via PagSeguro.
        </small>
      </div>

      <div className="mt-4 d-flex justify-content-between">
        <button type="button" className="btn btn-outline-secondary" onClick={onBack}>
          <svg className="me-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          Voltar
        </button>
        <button type="submit" className="btn btn-primary px-4">
          Revisar Pedido
          <svg className="ms-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>
    </form>
  );
}
