'use client';

import { useState, useEffect } from 'react';

interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  name: string;
}

interface ShippingOption {
  service: string;
  code: string;
  price: number;
  estimatedDays: number;
  description: string;
}

interface ShippingData {
  service: string;
  price: number;
  estimatedDays: number;
}

interface Props {
  zipCode: string;
  cartItems: CartItem[];
  data: ShippingData | null;
  onSave: (data: ShippingData) => void;
  onBack: () => void;
}

// Formatar preço em BRL
function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

export function ShippingStep({ zipCode, cartItems, data, onSave, onBack }: Props) {
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [selected, setSelected] = useState<string>(data?.service || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Buscar opções de frete
  useEffect(() => {
    const fetchShipping = async () => {
      setLoading(true);
      setError('');

      try {
        const res = await fetch('/api/shipping/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zipCode: zipCode.replace(/\D/g, ''),
            items: cartItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          }),
        });

        if (!res.ok) {
          throw new Error('Erro ao calcular frete');
        }

        const data = await res.json();
        setOptions(data.options || []);

        // Selecionar primeira opção se não houver seleção
        if (!selected && data.options?.length > 0) {
          setSelected(data.options[0].service);
        }
      } catch {
        // Se não conseguir buscar da API, mostrar opções simuladas
        const simulatedOptions: ShippingOption[] = [
          {
            service: 'PAC',
            code: '04510',
            price: 25.90,
            estimatedDays: 8,
            description: 'PAC - Encomenda Econômica',
          },
          {
            service: 'SEDEX',
            code: '04014',
            price: 45.50,
            estimatedDays: 3,
            description: 'SEDEX - Entrega Expressa',
          },
          {
            service: 'SEDEX 10',
            code: '40215',
            price: 89.90,
            estimatedDays: 1,
            description: 'SEDEX 10 - Entrega até às 10h',
          },
        ];
        setOptions(simulatedOptions);
        if (!selected) {
          setSelected(simulatedOptions[0].service);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchShipping();
  }, [zipCode, cartItems, selected]);

  // Submeter
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedOption = options.find((opt) => opt.service === selected);
    if (selectedOption) {
      onSave({
        service: selectedOption.service,
        price: selectedOption.price,
        estimatedDays: selectedOption.estimatedDays,
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Calculando frete...</span>
        </div>
        <p className="text-muted">Calculando opções de frete para CEP {zipCode}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-5">
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-outline-primary" onClick={onBack}>
          Voltar e verificar endereço
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h5 className="mb-4">Escolha a Forma de Envio</h5>

      <p className="text-muted mb-4">
        Entrega para CEP: <strong>{zipCode}</strong>
      </p>

      {options.length === 0 ? (
        <div className="alert alert-warning">
          Não foi possível calcular o frete para este CEP. 
          Por favor, verifique o endereço ou entre em contato conosco.
        </div>
      ) : (
        <div className="d-flex flex-column gap-3 mb-4">
          {options.map((option) => (
            <label
              key={option.service}
              className={`card cursor-pointer ${
                selected === option.service ? 'border-primary bg-primary bg-opacity-10' : ''
              }`}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-body p-3">
                <div className="form-check d-flex align-items-start m-0">
                  <input
                    type="radio"
                    name="shipping"
                    className="form-check-input mt-1 me-3"
                    checked={selected === option.service}
                    onChange={() => setSelected(option.service)}
                  />
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <strong className="d-block">{option.description}</strong>
                        <small className="text-muted">
                          Prazo estimado: {option.estimatedDays} dia{option.estimatedDays > 1 ? 's' : ''} úteis
                        </small>
                      </div>
                      <span className="h5 mb-0 text-primary">{formatPrice(option.price)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Informações extras */}
      <div className="alert alert-info d-flex align-items-start">
        <svg className="me-2 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <small>
          O prazo de entrega começa a contar após a confirmação do pagamento. 
          Entregas podem sofrer atrasos em períodos de alta demanda.
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
        <button 
          type="submit" 
          className="btn btn-primary px-4"
          disabled={!selected || options.length === 0}
        >
          Continuar para Pagamento
          <svg className="ms-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>
    </form>
  );
}
