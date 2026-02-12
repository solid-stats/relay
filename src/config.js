import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(8787),
  TRUST_PROXY: z.string().optional(),
  RELAY_TARGET_URL: z.string().url().default('https://sg.zone'),
  RELAY_RATE_LIMIT_PER_MINUTE: z.coerce
    .number()
    .int()
    .min(1)
    .max(100000)
    .default(600),
  RELAY_TOKEN_SECRET: z.string().min(32),
  RELAY_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(3650).default(30),
  RELAY_ADMIN_RATE_LIMIT_PER_MINUTE: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(30),
  RELAY_ADMIN_EMAILS: z.string().min(3),
  TRUSTED_AUTH_EMAIL_HEADER: z.string().min(1).default('remote-email'),
  TRUSTED_AUTH_USER_HEADER: z.string().min(1).default('remote-user'),
  TRUSTED_AUTH_SECRET_HEADER: z.string().min(1).default('x-auth-proxy-secret'),
  TRUSTED_AUTH_SHARED_SECRET: z.string().min(32),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    'Environment validation failed:',
    parsedEnv.error.flatten().fieldErrors,
  );
  process.exit(1);
}

const parseTrustProxy = (rawTrustProxy) => {
  if (!rawTrustProxy) {
    return false;
  }

  if (rawTrustProxy === 'true') {
    return true;
  }

  if (rawTrustProxy === 'false') {
    return false;
  }

  const trustProxyAsNumber = Number(rawTrustProxy);

  if (!Number.isNaN(trustProxyAsNumber)) {
    return trustProxyAsNumber;
  }

  return rawTrustProxy;
};

const parseAdminEmails = (rawAdminEmails) =>
  new Set(
    rawAdminEmails
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

const adminEmails = parseAdminEmails(parsedEnv.data.RELAY_ADMIN_EMAILS);

if (adminEmails.size === 0) {
  console.error('RELAY_ADMIN_EMAILS must contain at least one email.');
  process.exit(1);
}

export const config = {
  ...parsedEnv.data,
  TRUST_PROXY: parseTrustProxy(parsedEnv.data.TRUST_PROXY),
  RELAY_ADMIN_EMAILS_SET: adminEmails,
  TRUSTED_AUTH_EMAIL_HEADER:
    parsedEnv.data.TRUSTED_AUTH_EMAIL_HEADER.toLowerCase(),
  TRUSTED_AUTH_USER_HEADER:
    parsedEnv.data.TRUSTED_AUTH_USER_HEADER.toLowerCase(),
  TRUSTED_AUTH_SECRET_HEADER:
    parsedEnv.data.TRUSTED_AUTH_SECRET_HEADER.toLowerCase(),
};
