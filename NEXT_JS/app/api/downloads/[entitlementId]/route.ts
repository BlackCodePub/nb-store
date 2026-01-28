import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildSignedUrl } from '../../../../src/server/digital/signed-url';
import { extractRequestContext } from '../../../../src/server/utils/request';
import { prisma } from '../../../../src/server/db/client';
import { authOptions } from '../../../../src/server/auth/options';
import { getUserDiscordAccount, getDiscordUserGuilds, checkProductGating, checkCategoryGating } from '../../../../src/server/discord/discord-gating-service';
import { rateLimitByRequest } from '../../../../src/server/utils/rate-limit';
import { logAudit, logSecurityEvent } from '../../../../src/server/utils/audit-logger';

export async function GET(req: Request, { params }: { params: Promise<{ entitlementId: string }> }) {
  const { entitlementId } = await params;

  const limit = await rateLimitByRequest(req, { prefix: 'download:file:', limit: 10, windowMs: 60_000 });
  if (!limit.allowed) {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    logSecurityEvent('security.rate_limited', ip, { scope: 'download:file' });
    return NextResponse.json({ error: 'muitas tentativas, tente mais tarde' }, { status: 429, headers: limit.headers });
  }
  
  const secret = process.env.STORAGE_SIGNING_SECRET;
  const baseUrl = process.env.STORAGE_PRIVATE_BASE_URL;
  if (!secret || !baseUrl) {
    return NextResponse.json({ error: 'Config de storage ausente' }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: limit.headers });

  const entitlement = await prisma.digitalEntitlement.findUnique({
    where: { id: entitlementId },
    include: { asset: true },
  });

  if (!entitlement || entitlement.userId !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: limit.headers });
  }

  if (entitlement.expiresAt && entitlement.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'expired' }, { status: 410, headers: limit.headers });
  }

  // Discord gating para download
  if (entitlement.asset.productId || entitlement.asset.variantId) {
    const discordAccount = await getUserDiscordAccount(userId);
    let userDiscordId: string | null = null;
    let userGuilds: string[] = [];

    if (discordAccount?.access_token) {
      userDiscordId = discordAccount.providerAccountId;
      const guilds = await getDiscordUserGuilds(discordAccount.access_token);
      userGuilds = guilds.map((g) => g.id);
    }

    let productId = entitlement.asset.productId || null;
    let categoryId: string | null | undefined;

    if (!productId && entitlement.asset.variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: entitlement.asset.variantId },
        select: { productId: true, product: { select: { categoryId: true } } },
      });
      productId = variant?.productId ?? null;
      categoryId = variant?.product?.categoryId;
    }

    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { categoryId: true },
      });
      categoryId = categoryId ?? product?.categoryId;

      const productCheck = await checkProductGating(productId, userDiscordId, userGuilds);
      if (!productCheck.allowed) {
        return NextResponse.json({ error: productCheck.reason || 'Discord gating bloqueado' }, { status: 403, headers: limit.headers });
      }

      if (categoryId) {
        const categoryCheck = await checkCategoryGating(categoryId, userDiscordId, userGuilds);
        if (!categoryCheck.allowed) {
          return NextResponse.json({ error: categoryCheck.reason || 'Discord gating bloqueado' }, { status: 403, headers: limit.headers });
        }
      }
    }
  }

  if (entitlement.asset.maxDownloads && entitlement.downloadsCount >= entitlement.asset.maxDownloads) {
    return NextResponse.json({ error: 'download_limit_reached' }, { status: 403, headers: limit.headers });
  }

  if (entitlement.asset.type !== 'file') {
    if (entitlement.asset.type === 'link' && entitlement.asset.url) {
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
            signedUrl: entitlement.asset.url ?? 'external_link',
          },
        });
      });

      await logAudit({
        action: 'download.accessed',
        userId,
        targetId: entitlement.id,
        targetType: 'digital-entitlement',
        metadata: { assetId: entitlement.asset.id, type: 'link' },
      });

      return NextResponse.redirect(entitlement.asset.url);
    }

    if (entitlement.asset.type === 'license' && entitlement.asset.licenseKey) {
      const { ip, userAgent } = extractRequestContext(req);
      await prisma.digitalDownloadLog.create({
        data: {
          entitlementId: entitlement.id,
          userId,
          ip,
          userAgent,
          signedUrl: 'license_key',
        },
      });
      await prisma.digitalEntitlement.update({
        where: { id: entitlement.id },
        data: { downloadsCount: { increment: 1 } },
      });
      await logAudit({
        action: 'download.accessed',
        userId,
        targetId: entitlement.id,
        targetType: 'digital-entitlement',
        metadata: { assetId: entitlement.asset.id, type: 'license' },
      });

      return NextResponse.json({ licenseKey: entitlement.asset.licenseKey }, { headers: limit.headers });
    }

    return NextResponse.json({ error: 'asset_not_downloadable' }, { status: 400, headers: limit.headers });
  }

  if (!entitlement.asset.path) {
    return NextResponse.json({ error: 'missing_asset_path' }, { status: 500, headers: limit.headers });
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

  await logAudit({
    action: 'download.accessed',
    userId,
    targetId: entitlement.id,
    targetType: 'digital-entitlement',
    metadata: { assetId: entitlement.asset.id, type: 'file' },
  });

  return NextResponse.redirect(signedUrl, { headers: limit.headers });
}
