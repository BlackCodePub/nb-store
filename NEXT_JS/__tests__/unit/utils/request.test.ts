import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractRequestContext } from '../../../src/server/utils/request';

test('extrai IP do primeiro valor de x-forwarded-for', () => {
  const headers = new Headers({
    'x-forwarded-for': '10.0.0.1, 10.0.0.2',
    'user-agent': 'jest-agent',
  });
  const req = new Request('https://exemplo.com', { headers });
  const ctx = extractRequestContext(req);

  assert.equal(ctx.ip, '10.0.0.1');
  assert.equal(ctx.userAgent, 'jest-agent');
});

test('faz fallback para x-real-ip e UA vazio', () => {
  const headers = new Headers({ 'x-real-ip': '192.168.0.5' });
  const req = new Request('https://exemplo.com', { headers });
  const ctx = extractRequestContext(req);

  assert.equal(ctx.ip, '192.168.0.5');
  assert.equal(ctx.userAgent, '');
});
