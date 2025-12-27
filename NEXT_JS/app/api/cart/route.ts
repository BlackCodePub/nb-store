// API do Carrinho - CRUD completo
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../src/server/auth/options';
import { prisma } from '../../../src/server/db/client';

// GET - Retorna o carrinho do usuário
export async function GET(req: Request) {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: { take: 1, orderBy: { position: 'asc' } },
            },
          },
          variant: true,
        },
      },
    },
  });

  if (!cart) {
    return NextResponse.json({ cart: null, items: [], subtotal: 0 });
  }

  // Calcular subtotal
  const subtotal = cart.items.reduce((acc, item) => {
    return acc + item.unitPriceSnapshot * item.quantity;
  }, 0);

  return NextResponse.json({
    cart: { id: cart.id },
    items: cart.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: item.unitPriceSnapshot,
      name: item.nameSnapshot,
      product: {
        slug: item.product.slug,
        image: item.product.images[0]?.url || null,
      },
      variant: item.variant
        ? { name: item.variant.name, stock: item.variant.stock }
        : null,
    })),
    subtotal,
  });
}

// POST - Adicionar item ao carrinho
export async function POST(req: Request) {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { productId, variantId, quantity = 1 } = body || {};

  if (!productId || !variantId) {
    return NextResponse.json({ error: 'productId e variantId obrigatórios' }, { status: 400 });
  }

  // Buscar produto e variante
  const [product, variant] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.productVariant.findUnique({ where: { id: variantId } }),
  ]);

  if (!product || !product.active) {
    return NextResponse.json({ error: 'produto não encontrado ou inativo' }, { status: 404 });
  }

  if (!variant || variant.productId !== productId) {
    return NextResponse.json({ error: 'variante inválida' }, { status: 400 });
  }

  if (variant.stock < quantity) {
    return NextResponse.json({ error: 'estoque insuficiente' }, { status: 400 });
  }

  const price = variant.price ?? product.price;
  const nameSnapshot = variant.name !== 'Default' ? `${product.name} - ${variant.name}` : product.name;

  // Criar ou buscar carrinho
  let cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId: session.user.id },
    });
  }

  // Verificar se já existe item no carrinho
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_productId_variantId: {
        cartId: cart.id,
        productId,
        variantId,
      },
    },
  });

  if (existingItem) {
    const newQty = existingItem.quantity + quantity;
    if (variant.stock < newQty) {
      return NextResponse.json({ error: 'estoque insuficiente para quantidade total' }, { status: 400 });
    }

    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: newQty,
        unitPriceSnapshot: price,
      },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        variantId,
        quantity,
        unitPriceSnapshot: price,
        nameSnapshot,
      },
    });
  }

  return NextResponse.json({ ok: true, message: 'Item adicionado ao carrinho' });
}

// PUT - Atualizar quantidade de item
export async function PUT(req: Request) {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { itemId, quantity } = body || {};

  if (!itemId || typeof quantity !== 'number') {
    return NextResponse.json({ error: 'itemId e quantity obrigatórios' }, { status: 400 });
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: { items: true },
  });

  if (!cart) {
    return NextResponse.json({ error: 'carrinho não encontrado' }, { status: 404 });
  }

  const item = cart.items.find((i) => i.id === itemId);
  if (!item) {
    return NextResponse.json({ error: 'item não encontrado' }, { status: 404 });
  }

  if (quantity <= 0) {
    // Remover item
    await prisma.cartItem.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true, message: 'Item removido' });
  }

  // Verificar estoque
  const variant = await prisma.productVariant.findUnique({
    where: { id: item.variantId! },
  });

  if (variant && variant.stock < quantity) {
    return NextResponse.json({ error: 'estoque insuficiente' }, { status: 400 });
  }

  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  });

  return NextResponse.json({ ok: true, message: 'Quantidade atualizada' });
}

// DELETE - Remover item ou limpar carrinho
export async function DELETE(req: Request) {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get('itemId');
  const clearAll = searchParams.get('clearAll') === 'true';

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
  });

  if (!cart) {
    return NextResponse.json({ error: 'carrinho não encontrado' }, { status: 404 });
  }

  if (clearAll) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return NextResponse.json({ ok: true, message: 'Carrinho limpo' });
  }

  if (itemId) {
    await prisma.cartItem.delete({ where: { id: itemId } }).catch(() => null);
    return NextResponse.json({ ok: true, message: 'Item removido' });
  }

  return NextResponse.json({ error: 'itemId ou clearAll obrigatório' }, { status: 400 });
}
