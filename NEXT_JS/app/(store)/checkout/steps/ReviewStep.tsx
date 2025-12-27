'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  name: string;
}

interface CheckoutData {
  address: {
    name: string;
    phone: string;
    zipCode: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  } | null;
  shipping: {
    service: string;
    price: number;
    estimatedDays: number;
  } | null;
  payment: {
    method: string;
    installments: number;
  } | null;
  coupon?: {
    id: string;
    code: string;
    type: string;
    value: number;
    discount: number;
  } | null;
}

interface Props {
  cartItems: CartItem[];
  subtotal: number;
  checkoutData: CheckoutData;
  couponDiscount: number;
  onBack: () => void;
}

// Formatar preço em BRL
function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

// Traduzir método de pagamento
function getPaymentMethodName(method: string): string {
  const names: Record<string, string> = {
    credit_card: 'Cartão de Crédito',
    pix: 'PIX',
    boleto: 'Boleto Bancário',
  };
  return names[method] || method;
}

export function ReviewStep({ cartItems, subtotal, checkoutData, couponDiscount, onBack }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const { address, shipping, payment, coupon } = checkoutData;

  // Calcular totais
  const shippingPrice = shipping?.price || 0;
  const pixDiscount = payment?.method === 'pix' ? subtotal * 0.05 : 0;
  const totalDiscount = couponDiscount + pixDiscount;
  const total = Math.max(0, subtotal + shippingPrice - totalDiscount);

  // Finalizar pedido
  const handleFinish = async () => {
    if (!acceptedTerms) {
      setError('Você precisa aceitar os termos para continuar');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          shipping,
          payment,
          items: cartItems,
          couponCode: coupon?.code || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar pedido');
      }

      // Redirecionar para página de pagamento ou confirmação
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        router.push(`/order/${data.orderId}/confirmation`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar pedido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h5 className="mb-4">Revisão do Pedido</h5>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Endereço */}
      <div className="card mb-3">
        <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
          <strong>
            <svg className="me-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            Endereço de Entrega
          </strong>
        </div>
        <div className="card-body">
          {address && (
            <>
              <p className="mb-1">
                <strong>{address.name}</strong>
              </p>
              <p className="mb-1 text-muted">
                {address.street}, {address.number}
                {address.complement && ` - ${address.complement}`}
              </p>
              <p className="mb-1 text-muted">
                {address.neighborhood} • {address.city}/{address.state}
              </p>
              <p className="mb-0 text-muted">
                CEP: {address.zipCode} • Tel: {address.phone}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Frete */}
      <div className="card mb-3">
        <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
          <strong>
            <svg className="me-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            Forma de Envio
          </strong>
        </div>
        <div className="card-body">
          {shipping && (
            <div className="d-flex justify-content-between">
              <div>
                <p className="mb-1">
                  <strong>{shipping.service}</strong>
                </p>
                <small className="text-muted">
                  Prazo: {shipping.estimatedDays} dia{shipping.estimatedDays > 1 ? 's' : ''} úteis
                </small>
              </div>
              <span className="h6 mb-0">{formatPrice(shipping.price)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Pagamento */}
      <div className="card mb-3">
        <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
          <strong>
            <svg className="me-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            Forma de Pagamento
          </strong>
        </div>
        <div className="card-body">
          {payment && (
            <>
              <p className="mb-1">
                <strong>{getPaymentMethodName(payment.method)}</strong>
              </p>
              {payment.method === 'credit_card' && payment.installments > 1 && (
                <small className="text-muted">
                  {payment.installments}x de {formatPrice(total / payment.installments)}
                </small>
              )}
              {payment.method === 'pix' && (
                <small className="text-success">
                  5% de desconto aplicado!
                </small>
              )}
            </>
          )}
        </div>
      </div>

      {/* Itens do Pedido */}
      <div className="card mb-4">
        <div className="card-header bg-transparent">
          <strong>
            <svg className="me-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            Itens do Pedido ({cartItems.length})
          </strong>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-borderless mb-0">
              <tbody>
                {cartItems.map((item) => (
                  <tr key={item.id}>
                    <td className="ps-3">
                      <span className="text-muted">{item.quantity}x</span> {item.name}
                    </td>
                    <td className="text-end pe-3">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Totais */}
      <div className="bg-light rounded p-3 mb-4">
        <div className="d-flex justify-content-between mb-2">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="d-flex justify-content-between mb-2">
          <span>Frete ({shipping?.service})</span>
          <span>{formatPrice(shippingPrice)}</span>
        </div>
        {couponDiscount > 0 && (
          <div className="d-flex justify-content-between mb-2 text-success">
            <span>Cupom ({coupon?.code})</span>
            <span>- {formatPrice(couponDiscount)}</span>
          </div>
        )}
        {pixDiscount > 0 && (
          <div className="d-flex justify-content-between mb-2 text-success">
            <span>Desconto PIX (5%)</span>
            <span>- {formatPrice(pixDiscount)}</span>
          </div>
        )}
        <hr className="my-2" />
        <div className="d-flex justify-content-between">
          <strong>Total</strong>
          <strong className="h4 mb-0 text-primary">{formatPrice(total)}</strong>
        </div>
      </div>

      {/* Termos */}
      <div className="mb-4">
        <div className="form-check">
          <input
            type="checkbox"
            id="terms"
            className="form-check-input"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
          />
          <label htmlFor="terms" className="form-check-label small">
            Li e concordo com os{' '}
            <a href="/termos" target="_blank" className="text-decoration-none">
              Termos de Uso
            </a>{' '}
            e{' '}
            <a href="/privacidade" target="_blank" className="text-decoration-none">
              Política de Privacidade
            </a>
          </label>
        </div>
      </div>

      <div className="d-flex justify-content-between">
        <button type="button" className="btn btn-outline-secondary" onClick={onBack}>
          <svg className="me-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          Voltar
        </button>
        <button 
          className="btn btn-success btn-lg px-5"
          onClick={handleFinish}
          disabled={loading || !acceptedTerms}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Processando...
            </>
          ) : (
            <>
              <svg className="me-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Finalizar Pedido
            </>
          )}
        </button>
      </div>
    </div>
  );
}
