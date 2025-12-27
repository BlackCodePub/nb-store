import crypto from 'crypto';

const DEFAULT_TTL_SECONDS = 5 * 60; // 5 minutes

export type SignedUrlInput = {
  key: string; // object path/key in the bucket
  baseUrl: string; // e.g. https://cdn.example.com/private
  secret: string; // shared signing secret
  expiresInSeconds?: number;
};

export function createSignedDownloadUrl({
  key,
  baseUrl,
  secret,
  expiresInSeconds = DEFAULT_TTL_SECONDS,
}: SignedUrlInput): string {
  if (!key || !baseUrl || !secret) throw new Error('Missing key, baseUrl or secret');
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const url = `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(key)}`;
  const toSign = `${url}:${expires}`;
  const signature = crypto.createHmac('sha256', secret).update(toSign).digest('hex');
  const search = new URLSearchParams({ expires: String(expires), signature }).toString();
  return `${url}?${search}`;
}

export function verifySignedDownloadUrl(url: string, secret: string): boolean {
  if (!url || !secret) return false;
  const parsed = new URL(url);
  const expires = Number(parsed.searchParams.get('expires'));
  const signature = parsed.searchParams.get('signature');
  if (!expires || !signature) return false;
  if (expires < Math.floor(Date.now() / 1000)) return false;

  const base = `${parsed.origin}${parsed.pathname}`;
  const expected = crypto.createHmac('sha256', secret).update(`${base}:${expires}`).digest('hex');
  return timingSafeCompare(signature, expected);
}

// Alias para compatibilidade com exemplos na documentação
export const buildSignedUrl = createSignedDownloadUrl;

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
