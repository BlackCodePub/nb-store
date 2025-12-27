import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { test } from 'node:test';
import { verifyPagSeguroSignature } from '../../../src/server/payments/pagseguro-client';

test('verifica assinatura válida do PagSeguro', () => {
  const secret = 'segredo-teste';
  const body = JSON.stringify({ provider_reference: 'ref-123', status: 'paid' });
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const headers = new Headers({ 'x-pagseguro-signature': signature });

  assert.equal(verifyPagSeguroSignature(headers, body, secret), true);
});

test('rejeita assinatura inválida', () => {
  const secret = 'segredo-teste';
  const body = JSON.stringify({ provider_reference: 'ref-123', status: 'paid' });
  const wrongSignature = crypto.createHmac('sha256', 'outro').update(body).digest('hex');
  const headers = new Headers({ 'x-pagseguro-signature': wrongSignature });

  assert.equal(verifyPagSeguroSignature(headers, body, secret), false);
});
