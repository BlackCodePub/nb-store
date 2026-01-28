import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../src/server/auth/options';
import { prisma } from '../../../src/server/db/client';
import {
  createCharge,
  createPixCharge,
  createCheckoutSession,
  type PagSeguroChargeRequest,
} from '../../../src/server/payments/pagseguro-service';
import { applyCoupon, validateCoupon } from '../../../src/server/pricing/coupon-service';
import { getCurrentExchangeRate } from '../../../src/server/fx/exchange-rate-service';
import { getUserDiscordAccount, getDiscordUserGuilds, checkCheckoutGating } from '../../../src/server/discord/discord-gating-service';

// URL base para redirecionamentos
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

interface AddressData {
  name: string;
  phone: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface ShippingData {
  service: string;
  price: number;
  estimatedDays: number;
}

interface PaymentData {
  method: string;
  installments: number;
}

interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  name: string;
}

interface CheckoutRequest {
  address: AddressData;
  shipping: ShippingData;
  payment: PaymentData;
  items: CartItem[];
  couponCode?: string;
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
    const body = await request.json() as CheckoutRequest;
    const { address, shipping, payment, items, couponCode } = body;

    // Validações básicas
    if (!address || !shipping || !payment || !items?.length) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    // Buscar carrinho do usuário para validar
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
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

    // Calcular subtotal
    let subtotal = 0;
    let subtotalCents = 0;
    const orderItems = [];
    const cartItemsForCoupon = [] as {
      productId: string;
      variantId?: string | null;
      categoryId?: string | null;
      quantity: number;
      unitPrice: number;
    }[];

    const gatingItems = [] as { productId: string; categoryId?: string | null }[];

    for (const cartItem of cart.items) {
      const price = cartItem.variant?.price ?? cartItem.product.price;
      const itemTotal = price * cartItem.quantity;
      subtotal += itemTotal;
      subtotalCents += Math.round(price * 100) * cartItem.quantity;

      orderItems.push({
        productId: cartItem.productId,
        variantId: cartItem.variantId,
        quantity: cartItem.quantity,
        price: price,
        name: cartItem.product.name + (cartItem.variant ? ` - ${cartItem.variant.name}` : ''),
      });

      cartItemsForCoupon.push({
        productId: cartItem.productId,
        variantId: cartItem.variantId,
        categoryId: cartItem.product.categoryId,
        quantity: cartItem.quantity,
        unitPrice: Math.round(price * 100),
      });

      gatingItems.push({
        productId: cartItem.productId,
        categoryId: cartItem.product.categoryId,
      });
    }

    // Discord gating
    const discordAccount = await getUserDiscordAccount(userId);
    let userDiscordId: string | null = null;
    let userGuilds: string[] = [];

    if (discordAccount?.access_token) {
      userDiscordId = discordAccount.providerAccountId;
      const guilds = await getDiscordUserGuilds(discordAccount.access_token);
      userGuilds = guilds.map((g) => g.id);
    }

    const gatingResult = await checkCheckoutGating(gatingItems, userDiscordId, userGuilds);
    if (!gatingResult.allowed) {
      return NextResponse.json(
        {
          error: gatingResult.reason || 'Requisitos do Discord não atendidos',
          blockedItems: gatingResult.blockedItems,
        },
        { status: 403 }
      );
    }

    // Aplicar desconto do cupom se houver
    let discount = 0;
    let couponId: string | null = null;
    let validCouponCode: string | null = null;

    if (couponCode) {
      const validation = await validateCoupon(
        couponCode,
        userId,
        subtotalCents,
        cartItemsForCoupon
      );

      if (!validation.valid || !validation.coupon) {
        return NextResponse.json(
          { error: validation.error || 'Cupom inválido' },
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
        cartItemsForCoupon,
        coupon.products,
        coupon.categories
      );

      discount = application.totalDiscount / 100;
      couponId = coupon.id;
      validCouponCode = coupon.code;
    }

    // Desconto do PIX (5%)
    if (payment.method === 'pix') {
      discount += subtotal * 0.05;
    }

    // Calcular total final
    const shippingPrice = shipping.price;
    const total = Math.max(0, subtotal - discount + shippingPrice);

    const exchangeRate = await getCurrentExchangeRate().catch(() => null);
    const fxRateUsed = exchangeRate?.rate ?? null;

    // Criar pedido em transação
    const order = await prisma.$transaction(async (tx) => {
      // 1. Criar pedido
      const newOrder = await tx.order.create({
        data: {
          userId,
          status: 'pending',
          subtotal,
          discountTotal: discount,
          shippingTotal: shippingPrice,
          total,
          couponCode: validCouponCode,
          fxRateUsed: fxRateUsed ?? undefined,
        },
      });

      if (couponId) {
        await tx.couponRedemption.create({
          data: {
            couponId,
            userId,
            orderId: newOrder.id,
          },
        });
      }

      // 2. Criar endereço de entrega
      await tx.orderAddress.create({
        data: {
          orderId: newOrder.id,
          type: 'shipping',
          name: address.name,
          phone: address.phone,
          zipCode: address.zipCode.replace(/\D/g, ''),
          street: address.street,
          number: address.number,
          complement: address.complement || null,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
        },
      });

      // 3. Criar itens do pedido
      for (const item of orderItems) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
          },
        });
        // Nota: Estoque é decrementado apenas quando o pedido é PAGO (via webhook)
      }

      // 4. Criar redemption do cupom se usado
      if (couponId) {
        await tx.couponRedemption.create({
          data: {
            couponId,
            userId,
            orderId: newOrder.id,
          },
        });
      }

      // 6. Limpar carrinho
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return newOrder;
    });

    // Buscar dados completos do usuário para PagSeguro
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    if (!user?.email) {
      return NextResponse.json(
        { error: 'Dados do usuário incompletos' },
        { status: 400 }
      );
    }

    // Montar request do PagSeguro
    const pagseguroItems = orderItems.map(item => ({
      id: item.productId,
      description: item.name.slice(0, 64), // PagSeguro limita a 64 chars
      quantity: item.quantity,
      amount: Math.round(item.price * 100), // Converter para centavos
    }));

    const webhookUrl = `${BASE_URL}/api/webhooks/pagseguro`;

    const pagseguroRequest: PagSeguroChargeRequest = {
      referenceId: order.id,
      customer: {
        name: user.name || address.name,
        email: user.email,
        cpf: '00000000000', // CPF será coletado no checkout do PagSeguro se necessário
        phone: address.phone,
      },
      items: pagseguroItems,
      shipping: {
        address: {
          street: address.street,
          number: address.number,
          complement: address.complement,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode.replace(/\D/g, ''),
        },
        amount: Math.round(shippingPrice * 100), // Em centavos
      },
      notificationUrl: webhookUrl,
      redirectUrl: `${BASE_URL}/order/${order.id}/confirmation`,
    };

    // Processar pagamento conforme método
    let paymentUrl: string | null = null;
    let pixData: { qrCodeImage?: string; qrCodeText?: string } | null = null;

    try {
      if (payment.method === 'pix') {
        // Criar cobrança PIX via API moderna
        try {
          const pixResponse = await createPixCharge(pagseguroRequest);
          
          // Salvar dados do pagamento
          await prisma.payment.create({
            data: {
              orderId: order.id,
              provider: 'pagseguro',
              providerReference: pixResponse.id,
              amount: total,
              status: 'pending',
              payloadJson: { method: 'pix' },
            },
          });

          pixData = {
            qrCodeImage: pixResponse.qrCodeImage,
            qrCodeText: pixResponse.qrCodeText,
          };
        } catch (pixError) {
          console.error('[Checkout] PIX API falhou, usando checkout redirect:', pixError);
          // Fallback para checkout redirect
          const checkoutResponse = await createCheckoutSession(pagseguroRequest);
          paymentUrl = checkoutResponse.checkoutUrl;
          
          await prisma.payment.create({
            data: {
              orderId: order.id,
              provider: 'pagseguro',
              providerReference: checkoutResponse.code,
              amount: total,
              status: 'pending',
              payloadJson: { method: 'pix' },
            },
          });
        }
      } else {
        // Usar checkout redirect do PagSeguro (funciona para todos os métodos)
        const checkoutResponse = await createCheckoutSession(pagseguroRequest);
        
        // Salvar dados do pagamento
        await prisma.payment.create({
          data: {
            orderId: order.id,
            provider: 'pagseguro',
            providerReference: checkoutResponse.code,
            amount: total,
            status: 'pending',
            payloadJson: { method: payment.method, installments: payment.installments },
          },
        });

        paymentUrl = checkoutResponse.checkoutUrl;
      }
    } catch (paymentError) {
      console.error('[Checkout] Erro ao criar pagamento PagSeguro:', paymentError);
      // Não falhar o checkout, retornar para página de confirmação com instruções
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.id.slice(-8).toUpperCase(),
      total,
      paymentUrl,
      pixData,
      message: 'Pedido criado com sucesso',
    });
  } catch (error) {
    console.error('Erro no checkout:', error);
    return NextResponse.json(
      { error: 'Erro ao processar pedido' },
      { status: 500 }
    );
  }
}
