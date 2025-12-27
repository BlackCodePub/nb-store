/**
 * API: Validar e aplicar cupom
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { prisma } from '../../../../src/server/db/client';
import { validateCoupon, applyCoupon } from '../../../../src/server/pricing/coupon-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(buildAuthOptions('store'));
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const { code } = await request.json();
    
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Código do cupom é obrigatório' }, { status: 400 });
    }
    
    // Buscar carrinho do usuário
    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, categoryId: true },
            },
          },
        },
      },
    });
    
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 });
    }
    
    // Calcular subtotal em centavos
    const subtotalCents = cart.items.reduce(
      (sum, item) => sum + Math.round(item.unitPriceSnapshot * 100) * item.quantity,
      0
    );
    
    // Preparar itens para validação
    const cartItems = cart.items.map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      categoryId: item.product.categoryId,
      quantity: item.quantity,
      unitPrice: Math.round(item.unitPriceSnapshot * 100), // em centavos
    }));
    
    // Validar cupom
    const validation = await validateCoupon(
      code,
      session.user.id,
      subtotalCents,
      cartItems
    );
    
    if (!validation.valid) {
      return NextResponse.json({
        valid: false,
        error: validation.error,
        errorCode: validation.errorCode,
      });
    }
    
    // Buscar detalhes do cupom para aplicar
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        products: true,
        categories: true,
      },
    });
    
    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'Cupom não encontrado' });
    }
    
    // Aplicar e calcular desconto
    const application = applyCoupon(
      coupon.type as 'percent' | 'fixed',
      coupon.value,
      cartItems,
      coupon.products,
      coupon.categories
    );
    
    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.type === 'percent' 
          ? `${coupon.value}% de desconto`
          : `R$ ${(coupon.value / 100).toFixed(2)} de desconto`,
      },
      discount: {
        total: application.totalDiscount / 100, // converter de centavos para reais
        items: application.itemDiscounts.map(i => ({
          ...i,
          discount: i.discount / 100,
        })),
      },
    });
  } catch (error) {
    console.error('[API /cart/coupon] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao validar cupom' },
      { status: 500 }
    );
  }
}

// DELETE: Remover cupom do carrinho
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(buildAuthOptions('store'));
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    // Por enquanto, apenas retorna sucesso
    // O cupom é aplicado apenas no momento do checkout
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /cart/coupon] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao remover cupom' },
      { status: 500 }
    );
  }
}
