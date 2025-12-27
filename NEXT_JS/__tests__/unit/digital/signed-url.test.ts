import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSignedDownloadUrl, verifySignedDownloadUrl } from '../../../src/server/digital/signed-url';

test('gera URL assinada verificável', () => {
  const secret = 'segredo-teste';
  const url = createSignedDownloadUrl({
    key: 'digital/arquivo.zip',
    baseUrl: 'https://cdn.exemplo.com/private',
    secret,
    expiresInSeconds: 120,
  });

  assert.equal(verifySignedDownloadUrl(url, secret), true);
});

test('URL expirada falha na verificação', () => {
  const secret = 'segredo-teste';
  const url = createSignedDownloadUrl({
    key: 'digital/arquivo.zip',
    baseUrl: 'https://cdn.exemplo.com/private',
    secret,
    expiresInSeconds: -60, // expirada
  });

  assert.equal(verifySignedDownloadUrl(url, secret), false);
});
