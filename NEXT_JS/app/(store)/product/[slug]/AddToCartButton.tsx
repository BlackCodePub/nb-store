'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Variant {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface AddToCartButtonProps {
  productId: string;
  productName: string;
  variants: Variant[];
  hasMultipleVariants: boolean;
}

// Formatar preço em BRL
function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

export function AddToCartButton({
  productId,
  productName,
  variants,
  hasMultipleVariants,
}: AddToCartButtonProps) {
  const router = useRouter();
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const isOutOfStock = selectedVariant ? selectedVariant.stock <= 0 : true;
  const maxStock = selectedVariant?.stock || 0;

  const handleAddToCart = async () => {
    if (!selectedVariantId || isOutOfStock) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          variantId: selectedVariantId,
          quantity,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao adicionar ao carrinho');
      }

      setMessage({ type: 'success', text: 'Adicionado ao carrinho!' });
      
      // Opcionalmente redirecionar para o carrinho
      // router.push('/cart');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao adicionar ao carrinho' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card border-0 bg-light p-4">
      {/* Seleção de Variante */}
      {hasMultipleVariants && (
        <div className="mb-3">
          <label className="form-label fw-semibold">Opção</label>
          <select
            className="form-select"
            value={selectedVariantId}
            onChange={(e) => {
              setSelectedVariantId(e.target.value);
              setQuantity(1);
            }}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id} disabled={v.stock <= 0}>
                {v.name} - {formatPrice(v.price)} {v.stock <= 0 ? '(Esgotado)' : `(${v.stock} em estoque)`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Preço da Variante Selecionada */}
      {hasMultipleVariants && selectedVariant && (
        <div className="mb-3">
          <span className="h4 text-primary fw-bold">{formatPrice(selectedVariant.price)}</span>
        </div>
      )}

      {/* Quantidade */}
      <div className="mb-3">
        <label className="form-label fw-semibold">Quantidade</label>
        <div className="input-group" style={{ maxWidth: 150 }}>
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            −
          </button>
          <input
            type="number"
            className="form-control text-center"
            value={quantity}
            min={1}
            max={maxStock}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1 && val <= maxStock) {
                setQuantity(val);
              }
            }}
            readOnly
          />
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={() => setQuantity(Math.min(maxStock, quantity + 1))}
            disabled={quantity >= maxStock}
          >
            +
          </button>
        </div>
        {!isOutOfStock && (
          <small className="text-muted">{maxStock} disponíveis</small>
        )}
      </div>

      {/* Estoque */}
      {isOutOfStock ? (
        <div className="alert alert-warning py-2 mb-3">
          <strong>Produto esgotado</strong>
        </div>
      ) : null}

      {/* Mensagem de feedback */}
      {message && (
        <div className={`alert py-2 mb-3 ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
          {message.text}
        </div>
      )}

      {/* Botão Adicionar */}
      <button
        className="btn btn-primary btn-lg w-100"
        onClick={handleAddToCart}
        disabled={loading || isOutOfStock}
      >
        {loading ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Adicionando...
          </>
        ) : (
          <>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="me-2"
            >
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
            </svg>
            Adicionar ao Carrinho
          </>
        )}
      </button>

      {/* Link para o carrinho */}
      {message?.type === 'success' && (
        <a href="/cart" className="btn btn-outline-primary w-100 mt-2">
          Ver Carrinho
        </a>
      )}
    </div>
  );
}
