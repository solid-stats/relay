import assert from 'node:assert/strict';
import test from 'node:test';

const setupEnv = () => {
  process.env.NODE_ENV = 'test';
  process.env.RELAY_TOKEN_SECRET = '12345678901234567890123456789012';
  process.env.RELAY_ADMIN_EMAILS = 'admin@example.com';
  process.env.TRUSTED_AUTH_SHARED_SECRET = 'abcdefghijklmnopqrstuvwxyz123456';
};

const loadTokenService = async () => {
  setupEnv();

  const moduleUrl = new URL('../src/token-service.js', import.meta.url);

  return import(`${moduleUrl.href}?cacheBust=${Date.now()}`);
};

test('issued token can be verified and exposes relay scope', async () => {
  const { issueRelayToken, verifyRelayToken } = await loadTokenService();

  const relayToken = await issueRelayToken({ username: 'alice', expiresInDays: 30 });
  const relayPayload = await verifyRelayToken(relayToken);

  assert.equal(relayPayload.scope, 'sg-stats-relay');
  assert.equal(relayPayload.sub, 'alice');
});

test('fingerprint is deterministic and token-specific', async () => {
  const { issueRelayToken, getRelayTokenFingerprint } = await loadTokenService();

  const firstToken = await issueRelayToken({ username: 'alice', expiresInDays: 30 });
  const secondToken = await issueRelayToken({ username: 'bob', expiresInDays: 30 });

  assert.equal(getRelayTokenFingerprint(firstToken), getRelayTokenFingerprint(firstToken));
  assert.notEqual(getRelayTokenFingerprint(firstToken), getRelayTokenFingerprint(secondToken));
  assert.equal(getRelayTokenFingerprint(firstToken).length, 16);
});
