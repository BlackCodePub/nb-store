'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Steps do Checkout
import { AddressStep } from './steps/AddressStep';
import { ShippingStep } from './steps/ShippingStep';
import { PaymentStep } from './steps/PaymentStep';
import { ReviewStep } from './steps/ReviewStep';

interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  name: string;
}

interface CouponData {
  id: string;
  code: string;
  type: string;
  value: number;
  description: string | null;
  discount: number;
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
  coupon: CouponData | null;
}

// Formatar preço em BRL
function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    address: null,
    shipping: null,
    payment: null,
    coupon: null,
  });

  // Estados do cupom
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // Buscar carrinho
  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch('/api/cart');
      if (res.status === 401) {
        router.push('/login?from=checkout');
        return;
      }
      const data = await res.json();
      if (!data.items || data.items.length === 0) {
        router.push('/cart');
        return;
      }
      setCartItems(data.items);
      setSubtotal(data.subtotal);
    } catch {
      router.push('/cart');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Atualizar dados do checkout
  const updateCheckoutData = (key: keyof CheckoutData, value: any) => {
    setCheckoutData((prev) => ({ ...prev, [key]: value }));
  };

  // Aplicar cupom
  const applyCoupon = async () => {
    if (!couponCode.trim()) return;

    setCouponLoading(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      const res = await fetch('/api/coupon/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, subtotal }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCouponError(data.error || 'Erro ao validar cupom');
        return;
      }

      updateCheckoutData('coupon', {
        ...data.coupon,
        discount: data.discount,
      });
      setCouponSuccess(data.message);
    } catch {
      setCouponError('Erro ao aplicar cupom');
    } finally {
      setCouponLoading(false);
    }
  };

  // Remover cupom
  const removeCoupon = () => {
    updateCheckoutData('coupon', null);
    setCouponCode('');
    setCouponError('');
    setCouponSuccess('');
  };

  // Calcular totais
  const shippingPrice = checkoutData.shipping?.price || 0;
  const couponDiscount = checkoutData.coupon?.discount || 0;
  const total = subtotal + shippingPrice - couponDiscount;

  // Navegação entre steps
  const nextStep = () => setStep((s) => Math.min(4, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  const steps = [
    { num: 1, title: 'Endereço' },
    { num: 2, title: 'Frete' },
    { num: 3, title: 'Pagamento' },
    { num: 4, title: 'Revisão' },
  ];

  return (
    <div className="container py-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Checkout</h1>
        <Link href="/cart" className="btn btn-outline-secondary btn-sm">
          Voltar ao Carrinho
        </Link>
      </div>

      {/* Steps Progress */}
      <div className="mb-5">
        <div className="d-flex justify-content-between position-relative">
          {steps.map((s, idx) => (
            <div
              key={s.num}
              className={`text-center flex-fill ${idx < steps.length - 1 ? 'position-relative' : ''}`}
            >
              <div
                className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-2 ${
                  step >= s.num ? 'bg-primary text-white' : 'bg-light text-muted'
                }`}
                style={{ width: 40, height: 40 }}
              >
                {step > s.num ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  s.num
                )}
              </div>
              <div className={`small ${step >= s.num ? 'text-primary fw-semibold' : 'text-muted'}`}>
                {s.title}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`position-absolute top-50 start-50 ${step > s.num ? 'bg-primary' : 'bg-light'}`}
                  style={{ width: '100%', height: 2, zIndex: -1, transform: 'translateY(-50%)' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="row g-4">
        {/* Main Content */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              {step === 1 && (
                <AddressStep
                  data={checkoutData.address}
                  onSave={(addr) => {
                    updateCheckoutData('address', addr);
                    nextStep();
                  }}
                />
              )}
              {step === 2 && (
                <ShippingStep
                  zipCode={checkoutData.address?.zipCode || ''}
                  cartItems={cartItems}
                  data={checkoutData.shipping}
                  onSave={(ship) => {
                    updateCheckoutData('shipping', ship);
                    nextStep();
                  }}
                  onBack={prevStep}
                />
              )}
              {step === 3 && (
                <PaymentStep
                  total={total}
                  data={checkoutData.payment}
                  onSave={(pay) => {
                    updateCheckoutData('payment', pay);
                    nextStep();
                  }}
                  onBack={prevStep}
                />
              )}
              {step === 4 && (
                <ReviewStep
                  cartItems={cartItems}
                  subtotal={subtotal}
                  checkoutData={checkoutData}
                  couponDiscount={couponDiscount}
                  onBack={prevStep}
                />
              )}
            </div>
          </div>
        </div>

        {/* Resumo do Pedido */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <h5 className="card-title mb-4">Resumo do Pedido</h5>

              <div className="small mb-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="d-flex justify-content-between mb-2">
                    <span className="text-truncate me-2" style={{ maxWidth: 180 }}>
                      {item.quantity}x {item.name}
                    </span>
                    <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <hr />

              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>

              <div className="d-flex justify-content-between mb-2">
                <span>Frete</span>
                <span>
                  {checkoutData.shipping ? formatPrice(shippingPrice) : 'A calcular'}
                </span>
              </div>

              {checkoutData.coupon && (
                <div className="d-flex justify-content-between mb-2 text-success">
                  <span>Cupom ({checkoutData.coupon.code})</span>
                  <span>- {formatPrice(couponDiscount)}</span>
                </div>
              )}

              <hr />

              <div className="d-flex justify-content-between">
                <strong>Total</strong>
                <strong className="text-primary h5 mb-0">{formatPrice(total)}</strong>
              </div>
            </div>
          </div>

          {/* Campo de Cupom */}
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="mb-3">Cupom de Desconto</h6>
              
              {checkoutData.coupon ? (
                <div className="d-flex align-items-center justify-content-between bg-success bg-opacity-10 rounded p-2">
                  <div>
                    <span className="badge bg-success me-2">{checkoutData.coupon.code}</span>
                    <small className="text-success">- {formatPrice(couponDiscount)}</small>
                  </div>
                  <button 
                    type="button"
                    className="btn btn-sm btn-link text-danger p-0"
                    onClick={removeCoupon}
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <>
                  <div className="input-group">
                    <input
                      type="text"
                      className={`form-control ${couponError ? 'is-invalid' : ''}`}
                      placeholder="Digite o código"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={applyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                    >
                      {couponLoading ? (
                        <span className="spinner-border spinner-border-sm" />
                      ) : (
                        'Aplicar'
                      )}
                    </button>
                  </div>
                  {couponError && (
                    <small className="text-danger">{couponError}</small>
                  )}
                  {couponSuccess && (
                    <small className="text-success">{couponSuccess}</small>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
