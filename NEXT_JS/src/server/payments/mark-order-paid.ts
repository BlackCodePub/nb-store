import type { PrismaClient } from '@prisma/client';
import { prisma as globalPrisma } from '../db/client';

type Tx = Pick<PrismaClient, 'payment' | 'order' | 'orderItem' | 'product' | 'productVariant' | 'digitalEntitlement' | 'digitalAsset' | 'orderEvent'>;

interface MarkOrderPaidParams {
  paymentId?: string;
  orderId?: string;
  tx?: Tx;
  paidAt?: Date;
  paymentReference?: string;
}

/**
 * Marca pedido como pago e executa efeitos colaterais:
 * 1. Atualiza status do pedido para 'paid'
 * 2. Baixa estoque dos produtos/variantes
 * 3. Cria entitlements para produtos digitais
 * 4. Registra evento de pagamento
 */
export async function markOrderPaid(params: MarkOrderPaidParams) {
  const { paymentId, orderId: directOrderId, tx, paidAt = new Date(), paymentReference } = params;
  const client = tx || globalPrisma;
  
  // Determinar orderId
  let orderId = directOrderId;
  
  if (!orderId && paymentId) {
    const payment = await client.payment.findUnique({ where: { id: paymentId } });
    if (!payment?.orderId) return null;
    orderId = payment.orderId;
  }
  
  if (!orderId) return null;
  
  // Buscar pedido com itens
  const order = await client.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
  });
  
  if (!order || order.status === 'paid') {
    // Já está pago - idempotência
    return order;
  }
  
  // 1. Atualizar status do pedido
  const updatedOrder = await client.order.update({
    where: { id: orderId },
    data: {
      status: 'paid',
      paidAt,
    },
  });
  
  // 2. Baixar estoque
  for (const item of order.items) {
    if (item.variantId) {
      // Baixar estoque da variante
      await decrementVariantStock(client, item.variantId, item.quantity);
    } else {
      // Baixar estoque do produto (se tiver campo stock)
      await decrementProductStock(client, item.productId, item.quantity);
    }
  }
  
  // 3. Criar entitlements para produtos digitais
  for (const item of order.items) {
    if (item.product.type === 'digital') {
      await createDigitalEntitlements(client, order.userId, item.productId, item.quantity);
    }
  }
  
  // 4. Registrar evento
  await client.orderEvent.create({
    data: {
      orderId,
      action: 'payment_confirmed',
      payload: {
        paymentReference,
        paidAt: paidAt.toISOString(),
      },
    },
  });
  
  return updatedOrder;
}

/**
 * Baixa estoque de uma variante
 */
async function decrementVariantStock(client: Tx, variantId: string, quantity: number) {
  const variant = await client.productVariant.findUnique({
    where: { id: variantId },
  });
  
  if (!variant) return;
  
  const newStock = Math.max(0, variant.stock - quantity);
  
  await client.productVariant.update({
    where: { id: variantId },
    data: { stock: newStock },
  });
  
  if (newStock === 0) {
    console.log(`[Stock] Variant ${variantId} is now out of stock`);
  }
}

/**
 * Baixa estoque de um produto (se existir campo de estoque)
 * Nota: O schema atual não tem campo stock em Product, apenas em Variant
 * Esta função é um placeholder para extensão futura
 */
async function decrementProductStock(client: Tx, productId: string, quantity: number) {
  // Por enquanto, produtos sem variantes não têm controle de estoque
  // Para adicionar, seria necessário um campo 'stock' no model Product
  console.log(`[Stock] Product ${productId} - ${quantity} units sold (no stock tracking)`);
}

/**
 * Cria entitlements para produtos digitais
 */
async function createDigitalEntitlements(
  client: Tx,
  userId: string,
  productId: string,
  quantity: number
) {
  // Buscar assets digitais do produto
  // Nota: Precisaria de uma relação ProductDigitalAsset no schema
  // Por enquanto, vamos criar um entitlement genérico
  
  // Buscar ou criar um asset para o produto
  const assetPath = `products/${productId}/download`;
  
  let asset = await client.digitalAsset.findFirst({
    where: { path: assetPath, productId },
  });
  
  if (!asset) {
    asset = await client.digitalAsset.create({
      data: { 
        name: `Download - ${productId}`,
        path: assetPath,
        productId,
      },
    });
  }
  
  // Criar entitlement (um por quantidade, ou apenas um se preferir)
  const existingEntitlement = await client.digitalEntitlement.findFirst({
    where: {
      userId,
      assetId: asset.id,
    },
  });
  
  if (!existingEntitlement) {
    await client.digitalEntitlement.create({
      data: {
        userId,
        assetId: asset.id,
        expiresAt: null, // Sem expiração por padrão
      },
    });
    
    console.log(`[Digital] Created entitlement for user ${userId} - product ${productId}`);
  }
}

// Alias para compatibilidade
export { markOrderPaid as markOrderAsPaid };

