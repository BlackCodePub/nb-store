import NextAuth from 'next-auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { rateLimitByRequest } from '../../../../src/server/utils/rate-limit';

function getHandler(req: NextRequest) {
	const hostSegment = req.headers.get('x-nb-host-segment') === 'admin' ? 'admin' : 'store';
	return NextAuth(buildAuthOptions(hostSegment));
}

async function rateLimitedAuth(req: NextRequest, ctx: unknown) {
	if (req.nextUrl.pathname.endsWith('/session')) {
		return getHandler(req)(req, ctx as any);
	}
	const limit = await rateLimitByRequest(req, { prefix: 'auth:nextauth:', limit: 20, windowMs: 60_000 });
	if (!limit.allowed) {
		return NextResponse.json({ error: 'muitas tentativas, tente novamente em instantes' }, {
			status: 429,
			headers: limit.headers,
		});
	}

	const res = await getHandler(req)(req, ctx as any);
	limit.headers.forEach((value, key) => {
		res.headers.set(key, value);
	});
	return res;
}

export { rateLimitedAuth as GET, rateLimitedAuth as POST };
