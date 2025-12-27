/**
 * Extração defensiva de IP e User-Agent a partir do request Next.js (Web API Request).
 */
export function extractRequestContext(req: Request) {
  const headers = req.headers;
  const userAgent = headers.get('user-agent') || '';

  // Tenta obter IP de headers comuns atrás de proxies; fallback para `x-real-ip`.
  const forwardedFor = headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0].trim() || headers.get('x-real-ip') || '';

  return { ip, userAgent };
}
