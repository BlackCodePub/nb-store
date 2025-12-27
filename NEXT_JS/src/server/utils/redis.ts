import Redis from 'ioredis';

let client: Redis | null | undefined = undefined;

export function getRedis() {
  if (client !== undefined) return client;
  const url = process.env.REDIS_URL;
  if (!url) {
    client = null;
    return client;
  }
  client = new Redis(url, {
    maxRetriesPerRequest: 2,
  });
  client.on('error', (err) => {
    console.error('Redis error', err);
  });
  return client;
}
