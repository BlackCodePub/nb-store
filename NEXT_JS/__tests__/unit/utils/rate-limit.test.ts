import { rateLimit } from '../../../src/server/utils/rate-limit';

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  delete process.env.REDIS_URL;
});

afterEach(() => {
  process.env = originalEnv;
});

test('rateLimit blocks after limit reached', async () => {
  const key = 'test:rate-limit';
  const limit = 2;
  const windowMs = 1_000;

  const first = await rateLimit(key, limit, windowMs);
  expect(first.allowed).toBe(true);
  expect(first.remaining).toBe(1);

  const second = await rateLimit(key, limit, windowMs);
  expect(second.allowed).toBe(true);
  expect(second.remaining).toBe(0);

  const third = await rateLimit(key, limit, windowMs);
  expect(third.allowed).toBe(false);
  expect(third.remaining).toBe(0);
  expect(third.headers.get('x-ratelimit-limit')).toBe(String(limit));
  expect(third.headers.get('x-ratelimit-remaining')).toBe('0');
  expect(third.headers.get('retry-after')).toBeTruthy();
});
