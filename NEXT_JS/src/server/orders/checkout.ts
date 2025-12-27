export type CheckoutItemInput = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

export type ProductInfo = {
  id: string;
  price: number;
  active: boolean;
};

export type VariantInfo = {
  id: string;
  productId: string;
  price: number | null;
  stock: number;
};

export type OrderItemPrepared = {
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number;
};

export class CheckoutError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function prepareOrderItems(
  items: CheckoutItemInput[],
  products: ProductInfo[],
  variants: VariantInfo[],
) {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const orderItems: OrderItemPrepared[] = [];

  for (const raw of items) {
    const quantity = Math.max(1, Number(raw.quantity || 1));
    const product = productMap.get(raw.productId);
    if (!product || product.active === false) continue;

    const variant = raw.variantId ? variantMap.get(raw.variantId) : null;
    if (variant && variant.productId !== product.id) continue;
    if (variant && variant.stock < quantity) {
      throw new CheckoutError('STOCK', `estoque insuficiente para variante ${variant.id}`);
    }

    const price = variant?.price ?? product.price;
    orderItems.push({ productId: product.id, variantId: variant?.id || null, quantity, price });
  }

  if (!orderItems.length) {
    throw new CheckoutError('NO_ITEMS', 'nenhum item válido');
  }

  const subtotal = orderItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
  return { orderItems, subtotal };
}

export function sanitizeTotals(
  subtotal: number,
  shippingTotal: number,
  discountTotal: number,
  taxRate: number,
) {
  const shipping = Math.max(0, Number.isFinite(shippingTotal) ? shippingTotal : 0);
  const discount = Math.min(Math.max(0, Number.isFinite(discountTotal) ? discountTotal : 0), subtotal);
  const taxBase = Math.max(0, subtotal - discount + shipping);
  const taxTotal = Math.max(0, taxBase * taxRate);
  const total = subtotal - discount + shipping + taxTotal;
  return { shippingTotal: shipping, discountTotal: discount, taxTotal, total };
}
