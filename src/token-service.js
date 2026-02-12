import { SignJWT, jwtVerify } from 'jose';

import { config } from './config.js';

const relayTokenScope = 'sg-stats-relay';
const tokenSecret = new TextEncoder().encode(config.RELAY_TOKEN_SECRET);

export const issueRelayToken = async ({ username, expiresInDays }) =>
  new SignJWT({
    scope: relayTokenScope,
    username,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(`${expiresInDays}d`)
    .sign(tokenSecret);

export const verifyRelayToken = async (relayToken) => {
  const { payload } = await jwtVerify(relayToken, tokenSecret, {
    algorithms: ['HS256'],
  });

  if (payload.scope !== relayTokenScope || typeof payload.sub !== 'string') {
    throw new Error('Invalid relay token payload.');
  }

  return payload;
};
