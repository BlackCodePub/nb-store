/**
 * Coupon Service
 * Validação, aplicação e rateio de cupons
 */

import { prisma } from '../db/client';

export interface CouponValidationResult {
  valid: boolean;
  coupon?: {
    id: string;
    code: string;
    type: 'percent' | 'fixed';
    value: number;
  };
  error?: string;
  errorCode?: 'NOT_FOUND' | 'INACTIVE' | 'EXPIRED' | 'NOT_STARTED' | 'MAX_USES' | 'MAX_USES_USER' | 'MIN_SUBTOTAL' | 'NO_ELIGIBLE_ITEMS';
}

export interface CouponApplicationResult {
  totalDiscount: number;
  itemDiscounts: {
    productId: string;
    variantId?: string;
    discount: number;
  }[];
}

export interface CartItemForCoupon {
  productId: string;
  variantId?: string | null;
  categoryId?: string | null;
  quantity: number;
  unitPrice: number;
}

/**
 * Valida se um cupom pode ser usado
 */
export async function validateCoupon(
  code: string,
  userId: string,
  subtotalCents: number,
  items: CartItemForCoupon[]
): Promise<CouponValidationResult> {
  // Buscar cupom
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      products: true,
      categories: true,
      redemptions: {
        where: { userId },
      },
      _count: {
        select: { redemptions: true },
      },
    },
  });
  
  if (!coupon) {
    return { valid: false, error: 'Cupom não encontrado', errorCode: 'NOT_FOUND' };
  }
  
  if (!coupon.isActive) {
    return { valid: false, error: 'Cupom inativo', errorCode: 'INACTIVE' };
  }
  
  const now = new Date();
  
  if (coupon.startsAt && now < coupon.startsAt) {
    return { valid: false, error: 'Cupom ainda não está válido', errorCode: 'NOT_STARTED' };
  }
  
  if (coupon.endsAt && now > coupon.endsAt) {
    return { valid: false, error: 'Cupom expirado', errorCode: 'EXPIRED' };
  }
  
  if (coupon.maxUsesTotal && coupon._count.redemptions >= coupon.maxUsesTotal) {
    return { valid: false, error: 'Cupom esgotado', errorCode: 'MAX_USES' };
  }
  
  if (coupon.maxUsesPerUser && coupon.redemptions.length >= coupon.maxUsesPerUser) {
    return { valid: false, error: 'Você já usou este cupom', errorCode: 'MAX_USES_USER' };
  }
  
  if (coupon.minSubtotalCents && subtotalCents < coupon.minSubtotalCents) {
    const minSubtotal = (coupon.minSubtotalCents / 100).toFixed(2);
    return { 
      valid: false, 
      error: `Subtotal mínimo: R$ ${minSubtotal}`, 
      errorCode: 'MIN_SUBTOTAL' 
    };
  }
  
  // Verificar se há itens elegíveis
  const eligibleItems = getEligibleItems(items, coupon.products, coupon.categories);
  if (eligibleItems.length === 0) {
    return { 
      valid: false, 
      error: 'Nenhum item elegível para este cupom', 
      errorCode: 'NO_ELIGIBLE_ITEMS' 
    };
  }
  
  return {
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type as 'percent' | 'fixed',
      value: coupon.value,
    },
  };
}

/**
 * Filtra itens elegíveis para o cupom
 */
function getEligibleItems(
  items: CartItemForCoupon[],
  couponProducts: { productId: string }[],
  couponCategories: { categoryId: string }[]
): CartItemForCoupon[] {
  // Se não tem restrição, todos são elegíveis
  if (couponProducts.length === 0 && couponCategories.length === 0) {
    return items;
  }
  
  const productIds = new Set(couponProducts.map(p => p.productId));
  const categoryIds = new Set(couponCategories.map(c => c.categoryId));
  
  return items.filter(item => {
    if (productIds.has(item.productId)) return true;
    if (item.categoryId && categoryIds.has(item.categoryId)) return true;
    return false;
  });
}

/**
 * Calcula o desconto e faz o rateio por item
 */
export function applyCoupon(
  couponType: 'percent' | 'fixed',
  couponValue: number,
  items: CartItemForCoupon[],
  couponProducts: { productId: string }[],
  couponCategories: { categoryId: string }[]
): CouponApplicationResult {
  const eligibleItems = getEligibleItems(items, couponProducts, couponCategories);
  
  if (eligibleItems.length === 0) {
    return { totalDiscount: 0, itemDiscounts: [] };
  }
  
  // Calcular subtotal dos itens elegíveis
  const eligibleSubtotal = eligibleItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  
  // Calcular desconto total
  let totalDiscount: number;
  if (couponType === 'percent') {
    totalDiscount = Math.round(eligibleSubtotal * (couponValue / 100));
  } else {
    // Fixed: valor em centavos
    totalDiscount = Math.min(couponValue, eligibleSubtotal);
  }
  
  // Ratear o desconto proporcionalmente
  const itemDiscounts = eligibleItems.map(item => {
    const itemTotal = item.unitPrice * item.quantity;
    const proportion = itemTotal / eligibleSubtotal;
    const discount = Math.round(totalDiscount * proportion);
    
    return {
      productId: item.productId,
      variantId: item.variantId || undefined,
      discount,
    };
  });
  
  // Ajustar arredondamento (colocar diferença no primeiro item)
  const totalCalculated = itemDiscounts.reduce((sum, i) => sum + i.discount, 0);
  if (totalCalculated !== totalDiscount && itemDiscounts.length > 0) {
    itemDiscounts[0].discount += totalDiscount - totalCalculated;
  }
  
  return { totalDiscount, itemDiscounts };
}

/**
 * Registra uso do cupom
 */
export async function redeemCoupon(
  couponId: string,
  userId: string,
  orderId: string
): Promise<void> {
  await prisma.couponRedemption.create({
    data: {
      couponId,
      userId,
      orderId,
    },
  });
}

/**
 * Remove cupom do pedido (se necessário cancelar)
 */
export async function unredeemCoupon(orderId: string): Promise<void> {
  await prisma.couponRedemption.deleteMany({
    where: { orderId },
  });
}
