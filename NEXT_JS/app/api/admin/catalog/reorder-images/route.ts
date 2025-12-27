import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../src/server/auth/options';
import { userIsAdmin, userHasPermission } from '../../../../../src/server/auth/rbac';
import { prisma } from '../../../../../src/server/db/client';
import { rateLimitByRequest } from '../../../../../src/server/utils/rate-limit';

export async function POST(req: Request) {
  const limit = await rateLimitByRequest(req, { prefix: 'catalog:reorder:', limit: 30, windowMs: 60_000 });
  if (!limit.allowed) return NextResponse.json({ error: 'rate limited' }, { status: 429, headers: limit.headers });

  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: limit.headers });
  const allowed =
    (await userIsAdmin(session.user.id)) ||
    (await userHasPermission(session.user.id, 'catalog:write')) ||
    (await userHasPermission(session.user.id, 'catalog:images'));
  if (!allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: limit.headers });

  const body = await req.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x: any) => typeof x === 'string') : [];
  if (!ids.length) return NextResponse.json({ error: 'ids vazios' }, { status: 400, headers: limit.headers });

  await prisma.$transaction(
    ids.map((id: string, idx: number) =>
      prisma.productImage.update({ where: { id }, data: { position: idx } })
    )
  );

  return NextResponse.json({ ok: true }, { headers: limit.headers });
}
