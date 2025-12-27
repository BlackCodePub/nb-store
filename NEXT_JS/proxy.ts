import { NextResponse, type NextRequest } from 'next/server';
import { getLocaleFromRequest } from './src/i18n/config';
import { getCorrelationId } from './src/server/utils/logger';

const ADMIN_HOST_KEYWORDS = ['admin.', 'admin-local'];
const STORE_COOKIE = process.env.auth_cookie_name || 'nb_store_session';
const ADMIN_COOKIE = process.env.admin_auth_cookie_name || 'nb_admin_session';

export function proxy(req: NextRequest) {
  const res = NextResponse.next();

  const correlationId = getCorrelationId(req.headers);
  res.headers.set('x-correlation-id', correlationId);

  const locale = getLocaleFromRequest(req);
  if (!req.cookies.get('NEXT_LOCALE')) {
    res.cookies.set('NEXT_LOCALE', locale, { path: '/', httpOnly: false });
  }

  const host = req.headers.get('host') || '';
  const isAdminHost = ADMIN_HOST_KEYWORDS.some((k) => host.includes(k));
  res.headers.set('x-nb-host-segment', isAdminHost ? 'admin' : 'store');
  res.headers.set('x-nb-auth-cookie', isAdminHost ? ADMIN_COOKIE : STORE_COOKIE);

  res.headers.set('x-nb-rate-limit', 'enabled');

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
