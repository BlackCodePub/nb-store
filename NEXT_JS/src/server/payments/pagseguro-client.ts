import crypto from 'crypto';

/**
 * Verifica a assinatura do webhook do PagSeguro usando HMAC-SHA256.
 * Espera que o header `x-pagseguro-signature` contenha o hash em hex.
 */
export function verifyPagSeguroSignature(headers: Headers, body: unknown, secret: string): boolean {
  if (!secret) return false;
  const signature = headers.get('x-pagseguro-signature');
  if (!signature) return false;

  const payload = typeof body === 'string' ? body : JSON.stringify(body ?? {});
  const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // Compare constante para evitar timing attacks
  return timingSafeCompare(signature, computed);
}

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
