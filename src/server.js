import { timingSafeEqual } from 'node:crypto';

import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { z } from 'zod';

import { getAdminPageHtml } from './admin-ui.js';
import { config } from './config.js';
import { issueRelayToken, verifyRelayToken } from './token-service.js';

const relayPathSchema = z
  .string()
  .min(1)
  .refine((path) => path.startsWith('/'), 'Path must start with /.')
  .refine((path) => !path.startsWith('//'), 'Path cannot start with //.')
  .refine((path) => !path.includes('://'), 'Path must be relative.');

const issueTokenRequestSchema = z.object({
  username: z.string().trim().min(2).max(64),
  expiresInDays: z.coerce.number().int().min(1).max(3650).optional(),
});

const app = express();
const relayTargetUrl = new URL(config.RELAY_TARGET_URL);

app.disable('x-powered-by');
app.set('trust proxy', config.TRUST_PROXY);

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(express.json({ limit: '64kb' }));

const relayRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: config.RELAY_RATE_LIMIT_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
});

const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: config.RELAY_ADMIN_RATE_LIMIT_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
});

const getHeaderValue = (request, headerName) => {
  const headerValue = request.headers[headerName];

  if (Array.isArray(headerValue)) {
    return headerValue[0];
  }

  return headerValue;
};

const areValuesEqual = (leftValue, rightValue) => {
  const leftBuffer = Buffer.from(leftValue, 'utf8');
  const rightBuffer = Buffer.from(rightValue, 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

const getRelayTokenFromRequest = (request) => {
  const authHeader = request.headers.authorization;

  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length);
  }

  const legacyHeader = request.headers['x-relay-token'];

  if (typeof legacyHeader === 'string') {
    return legacyHeader;
  }

  return null;
};

const requireRelayToken = async (request, response, next) => {
  const relayToken = getRelayTokenFromRequest(request);

  if (!relayToken) {
    response.status(401).json({ error: 'Relay token is required.' });

    return;
  }

  try {
    const relayPayload = await verifyRelayToken(relayToken);

    request.relayUser = relayPayload.sub;
    next();
  } catch (error) {
    response.status(401).json({ error: 'Invalid relay token.' });
  }
};

const requireTrustedAuthProxy = (request, response, next) => {
  const proxySecret = getHeaderValue(
    request,
    config.TRUSTED_AUTH_SECRET_HEADER,
  );

  if (
    !proxySecret ||
    !areValuesEqual(proxySecret, config.TRUSTED_AUTH_SHARED_SECRET)
  ) {
    response
      .status(401)
      .json({ error: 'Request is not trusted auth-proxy traffic.' });

    return;
  }

  const adminEmail = getHeaderValue(request, config.TRUSTED_AUTH_EMAIL_HEADER);

  if (!adminEmail) {
    response
      .status(401)
      .json({ error: 'Authenticated email header is missing.' });

    return;
  }

  const normalizedAdminEmail = adminEmail.trim().toLowerCase();

  if (!config.RELAY_ADMIN_EMAILS_SET.has(normalizedAdminEmail)) {
    response.status(403).json({ error: 'Access denied for this user.' });

    return;
  }

  const adminUser = getHeaderValue(request, config.TRUSTED_AUTH_USER_HEADER);

  request.accessEmail = normalizedAdminEmail;
  request.accessUser = adminUser || normalizedAdminEmail;

  next();
};

const attachRelayPath = (request, response, next) => {
  const parsedRelayPath = relayPathSchema.safeParse(request.query.path);

  if (!parsedRelayPath.success) {
    response
      .status(400)
      .json({ error: parsedRelayPath.error.issues[0].message });

    return;
  }

  request.relayPath = parsedRelayPath.data;
  next();
};

const relayProxy = createProxyMiddleware({
  target: relayTargetUrl.origin,
  changeOrigin: true,
  secure: true,
  xfwd: true,
  pathRewrite: (_path, request) => request.relayPath,
  logLevel: config.NODE_ENV === 'development' ? 'debug' : 'warn',
});

app.get('/health', (_request, response) => {
  response.json({ ok: true });
});

app.get(
  '/admin',
  adminRateLimiter,
  requireTrustedAuthProxy,
  (_request, response) => {
    response.type('html').send(getAdminPageHtml());
  },
);

app.post(
  '/admin/tokens',
  adminRateLimiter,
  requireTrustedAuthProxy,
  async (request, response) => {
    const parsedBody = issueTokenRequestSchema.safeParse(request.body);

    if (!parsedBody.success) {
      response.status(400).json({ error: parsedBody.error.issues[0].message });

      return;
    }

    const expiresInDays =
      parsedBody.data.expiresInDays ?? config.RELAY_TOKEN_TTL_DAYS;
    const token = await issueRelayToken({
      username: parsedBody.data.username,
      expiresInDays,
    });

    response.json({
      username: parsedBody.data.username,
      issuedBy: request.accessEmail,
      expiresInDays,
      token,
    });
  },
);

app.get(
  '/relay',
  relayRateLimiter,
  requireRelayToken,
  attachRelayPath,
  relayProxy,
);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: 'Internal Server Error' });
});

app.listen(config.PORT, config.HOST, () => {
  console.log(`sg-stats-relay started on ${config.HOST}:${config.PORT}`);
  console.log(`relay target: ${relayTargetUrl.origin}`);
});
