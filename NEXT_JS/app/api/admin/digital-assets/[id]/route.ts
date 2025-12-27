import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../src/server/auth/options';
import { userIsAdmin } from '../../../../../src/server/auth/rbac';
import { prisma } from '../../../../../src/server/db/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const asset = await prisma.digitalAsset.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, name: true } },
      variant: { select: { id: true, name: true } },
    },
  });

  if (!asset) {
    return NextResponse.json({ error: 'Ativo não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ asset });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
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

    // Determinar onde salvar o valor baseado no tipo
    const updateData: {
      name?: string;
      type?: string;
      path?: string | null;
      url?: string | null;
      licenseKey?: string | null;
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
      // Resetar campos anteriores
      path: null,
      url: null,
      licenseKey: null,
    };

    if (type === 'file') {
      updateData.path = value;
    } else if (type === 'link') {
      updateData.url = value;
    } else if (type === 'license') {
      updateData.licenseKey = value;
    }

    const asset = await prisma.digitalAsset.update({
      where: { id },
      data: updateData,
      include: {
        product: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ asset });
  } catch (error) {
    console.error('Erro ao atualizar ativo digital:', error);
    return NextResponse.json({ error: 'Erro ao atualizar ativo digital' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    await prisma.digitalAsset.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir ativo digital:', error);
    return NextResponse.json({ error: 'Erro ao excluir ativo digital' }, { status: 500 });
  }
}
