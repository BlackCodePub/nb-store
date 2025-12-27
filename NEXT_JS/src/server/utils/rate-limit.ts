import { getRedis } from './redis';

type Bucket = {
  remaining: number;
  resetAt: number;
};

type ConsumeOptions = {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

type ConsumeResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
};

// In-memory buckets (best-effort, process-local).
const buckets = new Map<string, Bucket>();

async function consumeBucket({ key, limit, windowMs, now = Date.now() }: ConsumeOptions): Promise<ConsumeResult> {
  const redis = getRedis();

  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pexpire(key, windowMs);
      }
      const ttl = await redis.pttl(key);
      const resetAt = ttl > 0 ? now + ttl : now + windowMs;
      const remaining = Math.max(0, limit - count);
      return { allowed: count <= limit, remaining, resetAt, limit };
    } catch (err) {
      console.error('Rate limit fallback para memória por erro no Redis', err);
    }
  }

  const bucket = buckets.get(key);
  const freshReset = now + windowMs;
  const state: Bucket = bucket && bucket.resetAt > now ? bucket : { remaining: limit, resetAt: freshReset };

  if (state.remaining <= 0) {
    buckets.set(key, state);
    return { allowed: false, remaining: 0, resetAt: state.resetAt, limit };
  }

  state.remaining -= 1;
  buckets.set(key, state);

  return { allowed: true, remaining: state.remaining, resetAt: state.resetAt, limit };
}

function resultHeaders(result: ConsumeResult) {
  const headers = new Headers();
  headers.set('x-ratelimit-limit', String(result.limit));
  headers.set('x-ratelimit-remaining', String(Math.max(result.remaining, 0)));
  headers.set('x-ratelimit-reset', String(Math.ceil(result.resetAt / 1000)));
  if (!result.allowed) {
    const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    headers.set('retry-after', String(retryAfter));
  }
  return headers;
}

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const result = await consumeBucket({ key, limit, windowMs });
  return { ...result, headers: resultHeaders(result) };
}

export async function rateLimitByRequest(
  req: Request,
  {
    limit,
    windowMs,
    prefix = '',
    byPath = true,
    byHostSegment = true,
  }: { limit: number; windowMs: number; prefix?: string; byPath?: boolean; byHostSegment?: boolean }
) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  const url = new URL(req.url);
  const hostSegment = byHostSegment ? req.headers.get('x-nb-host-segment') || 'host' : 'any';
  const pathPart = byPath ? url.pathname : '';
  const key = `${prefix}${hostSegment}:${req.method}:${pathPart}:${ip}`;
  return rateLimit(key, limit, windowMs);
}
