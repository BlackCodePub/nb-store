import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildSignedUrl } from '../../../../src/server/digital/signed-url';
import { extractRequestContext } from '../../../../src/server/utils/request';
import { prisma } from '../../../../src/server/db/client';
import { authOptions } from '../../../../src/server/auth/options';

export async function GET(req: Request, { params }: { params: Promise<{ entitlementId: string }> }) {
  const { entitlementId } = await params;
  
  const secret = process.env.STORAGE_SIGNING_SECRET;
  const baseUrl = process.env.STORAGE_PRIVATE_BASE_URL;
  if (!secret || !baseUrl) {
    return NextResponse.json({ error: 'Config de storage ausente' }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const entitlement = await prisma.digitalEntitlement.findUnique({
    where: { id: entitlementId },
    include: { asset: true },
  });

  if (!entitlement || entitlement.userId !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (entitlement.expiresAt && entitlement.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }

  const signedUrl = buildSignedUrl({
    key: entitlement.asset.path,
    baseUrl,
    secret,
    expiresInSeconds: Number(process.env.STORAGE_SIGNED_URL_TTL_SECONDS ?? 300),
  });

  const { ip, userAgent } = extractRequestContext(req);

  await prisma.$transaction(async (tx) => {
    await tx.digitalEntitlement.update({
      where: { id: entitlement.id },
      data: { downloadsCount: { increment: 1 } },
    });
    await tx.digitalDownloadLog.create({
      data: {
        entitlementId: entitlement.id,
        userId,
        ip,
        userAgent,
        signedUrl,
      },
    });
  });

  return NextResponse.redirect(signedUrl);
}
