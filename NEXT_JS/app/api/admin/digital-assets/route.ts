import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { userIsAdmin } from '../../../../src/server/auth/rbac';
import { prisma } from '../../../../src/server/db/client';

export async function GET(request: NextRequest) {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const where = productId ? { productId } : {};

  const [assets, total] = await Promise.all([
    prisma.digitalAsset.findMany({
      where,
      include: {
        product: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true, sku: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.digitalAsset.count({ where }),
  ]);

  return NextResponse.json({
    assets,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, type, value, productId, variantId, maxDownloads, expirationDays } = body;

    if (!name || !type || !value) {
      return NextResponse.json({ error: 'Nome, tipo e valor são obrigatórios' }, { status: 400 });
    }

    if (!productId && !variantId) {
      return NextResponse.json({ error: 'Produto ou variante é obrigatório' }, { status: 400 });
    }

    // Determinar onde salvar o valor baseado no tipo
    const assetData: {
      name: string;
      type: string;
      path?: string;
      url?: string;
      licenseKey?: string;
      productId?: string | null;
      variantId?: string | null;
      maxDownloads?: number | null;
      expirationDays?: number | null;
    } = {
      name,
      type,
      productId: productId || null,
      variantId: variantId || null,
      maxDownloads: maxDownloads ? parseInt(maxDownloads) : null,
      expirationDays: expirationDays ? parseInt(expirationDays) : null,
    };

    if (type === 'file') {
      assetData.path = value;
    } else if (type === 'link') {
      assetData.url = value;
    } else if (type === 'license') {
      assetData.licenseKey = value;
    }

    const asset = await prisma.digitalAsset.create({
      data: assetData,
      include: {
        product: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar ativo digital:', error);
    return NextResponse.json({ error: 'Erro ao criar ativo digital' }, { status: 500 });
  }
}
