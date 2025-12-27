'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  name: string;
  product: {
    slug: string;
    image: string | null;
  };
  variant: {
    name: string;
    stock: number;
  } | null;
}

interface CartData {
  cart: { id: string } | null;
  items: CartItem[];
  subtotal: number;
}

// Formatar preço em BRL
function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

export default function CartPage() {
  const router = useRouter();
  const [data, setData] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch('/api/cart');
      if (res.status === 401) {
        // Não autenticado - redirecionar para login
        router.push('/login?from=cart');
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError('Erro ao carregar carrinho');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const updateQuantity = async (itemId: string, quantity: number) => {
    setUpdating(itemId);
    try {
      const res = await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, quantity }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao atualizar');
      }

      await fetchCart();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setUpdating(itemId);
    try {
      await fetch(`/api/cart?itemId=${itemId}`, { method: 'DELETE' });
      await fetchCart();
    } catch (err) {
      setError('Erro ao remover item');
    } finally {
      setUpdating(null);
    }
  };

  const clearCart = async () => {
    if (!confirm('Limpar todo o carrinho?')) return;
    setLoading(true);
    try {
      await fetch('/api/cart?clearAll=true', { method: 'DELETE' });
      await fetchCart();
    } catch (err) {
      setError('Erro ao limpar carrinho');
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  const items = data?.items || [];
  const subtotal = data?.subtotal || 0;
  const isEmpty = items.length === 0;

  return (
    <div className="container py-5">
      <h1 className="h3 mb-4">Meu Carrinho</h1>

      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {isEmpty ? (
        <div className="text-center py-5">
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-muted mb-3"
          >
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
          </svg>
          <h5 className="text-muted">Seu carrinho está vazio</h5>
          <Link href="/" className="btn btn-primary mt-3">
            Continuar Comprando
          </Link>
        </div>
      ) : (
        <div className="row g-4">
          {/* Lista de Itens */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-muted">{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
                  <button className="btn btn-sm btn-outline-danger" onClick={clearCart}>
                    Limpar Carrinho
                  </button>
                </div>

                <div className="list-group list-group-flush">
                  {items.map((item) => (
                    <div key={item.id} className="list-group-item px-0 py-3">
                      <div className="row align-items-center">
                        {/* Imagem */}
                        <div className="col-3 col-md-2">
                          <Link href={`/product/${item.product.slug}`}>
                            <div
                              className="bg-light rounded d-flex align-items-center justify-content-center"
                              style={{ width: 80, height: 80, overflow: 'hidden' }}
                            >
                              {item.product.image ? (
                                <img
                                  src={item.product.image}
                                  alt={item.name}
                                  className="img-fluid"
                                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                                />
                              ) : (
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
                                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                                </svg>
                              )}
                            </div>
                          </Link>
                        </div>

                        {/* Info */}
                        <div className="col-9 col-md-5">
                          <Link
                            href={`/product/${item.product.slug}`}
                            className="text-decoration-none text-dark fw-semibold"
                          >
                            {item.name}
                          </Link>
                          <div className="text-muted small">
                            {formatPrice(item.unitPrice)} un.
                          </div>
                        </div>

                        {/* Quantidade */}
                        <div className="col-6 col-md-3 mt-2 mt-md-0">
                          <div className="input-group input-group-sm" style={{ maxWidth: 120 }}>
                            <button
                              className="btn btn-outline-secondary"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={updating === item.id || item.quantity <= 1}
                            >
                              −
                            </button>
                            <span className="form-control text-center bg-white">
                              {updating === item.id ? '...' : item.quantity}
                            </span>
                            <button
                              className="btn btn-outline-secondary"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={updating === item.id || (item.variant && item.quantity >= item.variant.stock)}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Total + Remover */}
                        <div className="col-6 col-md-2 mt-2 mt-md-0 text-end">
                          <div className="fw-bold">{formatPrice(item.unitPrice * item.quantity)}</div>
                          <button
                            className="btn btn-link btn-sm text-danger p-0"
                            onClick={() => removeItem(item.id)}
                            disabled={updating === item.id}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Resumo */}
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h5 className="card-title mb-4">Resumo do Pedido</h5>

                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                <div className="d-flex justify-content-between mb-2 text-muted">
                  <span>Frete</span>
                  <span>Calculado no checkout</span>
                </div>

                <hr />

                <div className="d-flex justify-content-between mb-4">
                  <strong>Total</strong>
                  <strong className="text-primary h5 mb-0">{formatPrice(subtotal)}</strong>
                </div>

                <Link href="/checkout" className="btn btn-primary btn-lg w-100">
                  Finalizar Compra
                </Link>

                <Link href="/" className="btn btn-outline-secondary w-100 mt-2">
                  Continuar Comprando
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
