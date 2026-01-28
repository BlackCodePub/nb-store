import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { prisma } from '../../../../src/server/db/client';

// GET - Lista downloads disponíveis do usuário
export async function GET() {
  const session = await getServerSession(buildAuthOptions('store'));

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const entitlements = await prisma.digitalEntitlement.findMany({
      where: { userId: session.user.id },
      include: {
        asset: true,
        downloads: {
          orderBy: { createdAt: 'desc' },
          take: 5, // Últimos 5 downloads
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const downloads = entitlements.map((entitlement) => {
      const isExpired = entitlement.expiresAt && entitlement.expiresAt.getTime() < Date.now();
      
      const fileName = entitlement.asset.name
        || entitlement.asset.path?.split('/').pop()
        || entitlement.asset.url
        || 'Arquivo digital';
      
      const maxDownloads = entitlement.asset.maxDownloads || null;
      const remainingDownloads = maxDownloads ? Math.max(0, maxDownloads - entitlement.downloadsCount) : null;

      return {
        id: entitlement.id,
        fileName,
        path: entitlement.asset.path,
        type: entitlement.asset.type,
        maxDownloads,
        remainingDownloads,
        createdAt: entitlement.createdAt.toISOString(),
        expiresAt: entitlement.expiresAt?.toISOString() || null,
        isExpired,
        downloadsCount: entitlement.downloadsCount,
        lastDownloads: entitlement.downloads.map((d) => ({
          downloadedAt: d.createdAt.toISOString(),
          ip: d.ip.substring(0, 10) + '...', // Parcialmente oculto por privacidade
        })),
      };
    });

    return NextResponse.json(downloads);
  } catch (error) {
    console.error('Erro ao listar downloads:', error);
    return NextResponse.json({ error: 'Erro ao carregar downloads' }, { status: 500 });
  }
}
