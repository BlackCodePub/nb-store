import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { prisma } from '../../../../src/server/db/client';
import { applyCoupon, validateCoupon } from '../../../../src/server/pricing/coupon-service';

interface ValidateRequest {
  code: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(buildAuthOptions('store'));
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json() as ValidateRequest;
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Código do cupom é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar carrinho do usuário para validar itens elegíveis
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { select: { id: true, categoryId: true } },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { error: 'Carrinho vazio' },
        { status: 400 }
      );
    }

    const cartItems = cart.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      categoryId: item.product.categoryId,
      quantity: item.quantity,
      unitPrice: Math.round(item.unitPriceSnapshot * 100),
    }));

    const subtotalCents = cartItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    const validation = await validateCoupon(
      code,
      userId,
      subtotalCents,
      cartItems
    );

    if (!validation.valid || !validation.coupon) {
      return NextResponse.json(
        { error: validation.error || 'Cupom inválido', errorCode: validation.errorCode },
        { status: 400 }
      );
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: validation.coupon.code },
      include: { products: true, categories: true },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: 'Cupom não encontrado' },
        { status: 404 }
      );
    }

    const application = applyCoupon(
      coupon.type as 'percent' | 'fixed',
      coupon.value,
      cartItems,
      coupon.products,
      coupon.categories
    );

    const discount = Math.round((application.totalDiscount / 100) * 100) / 100;

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      },
      discount,
      message: coupon.type === 'percent'
        ? `${coupon.value}% de desconto aplicado!`
        : `R$ ${(coupon.value / 100).toFixed(2).replace('.', ',')} de desconto aplicado!`,
    });
  } catch (error) {
    console.error('Erro ao validar cupom:', error);
    return NextResponse.json(
      { error: 'Erro ao validar cupom' },
      { status: 500 }
    );
  }
}
