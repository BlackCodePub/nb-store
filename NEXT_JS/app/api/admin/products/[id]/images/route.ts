import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../../src/server/auth/options';
import { userHasPermission, userIsAdmin } from '../../../../../../src/server/auth/rbac';
import { prisma } from '../../../../../../src/server/db/client';

async function checkAuth() {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return { authorized: false, reason: 'Não autenticado' };
  }
  const isAdmin = await userIsAdmin(session.user.id);
  const canImages = isAdmin || (await userHasPermission(session.user.id, 'catalog:images'));
  const canWrite = isAdmin || (await userHasPermission(session.user.id, 'catalog:write'));
  if (!canImages && !canWrite) {
    return { authorized: false, reason: 'Sem permissão' };
  }
  return { authorized: true, userId: session.user.id };
}

// POST /api/admin/products/[id]/images - adicionar imagens
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { id: productId } = await params;

  try {
    const body = await req.json();
    const { urls, variantId, position } = body;

    // Verificar se o produto existe
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // URLs pode ser string ou array
    const urlList = Array.isArray(urls) ? urls : [urls];
    const validUrls = urlList.filter((u: string) => u && u.trim());

    if (validUrls.length === 0) {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 });
    }

    // Obter próxima posição se não informada
    let startPos = parseInt(position) || 0;
    if (!position) {
      const maxPos = await prisma.productImage.aggregate({
        where: { productId },
        _max: { position: true },
      });
      startPos = (maxPos._max.position ?? 0) + 1;
    }

    // Criar imagens
    await prisma.productImage.createMany({
      data: validUrls.map((url: string, i: number) => ({
        productId,
        variantId: variantId || null,
        url: url.trim(),
        position: startPos + i,
      })),
    });

    // Buscar imagens criadas
    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json({ images });
  } catch (error) {
    console.error('Erro ao adicionar imagens:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// GET /api/admin/products/[id]/images - listar imagens
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { id: productId } = await params;

  try {
    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json({ images });
  } catch (error) {
    console.error('Erro ao listar imagens:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
