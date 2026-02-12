import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const logsRootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-relay-logs-'));

process.env.NODE_ENV = 'development';
process.env.RELAY_LOGS_DIR = logsRootPath;

const loggerModuleUrl = new URL('../src/logger.js', import.meta.url);
const { default: logger } = await import(`${loggerModuleUrl.href}?cacheBust=${Date.now()}`);

test('writes issued tokens into a single dedicated file', () => {
  assert.equal(typeof logger.issuedToken, 'function');

  logger.issuedToken({
    username: 'alice',
    tokenFingerprint: 'abcd1234abcd1234',
    issuedBy: 'admin@example.com',
  });

  const issuedTokensFilePath = path.join(logsRootPath, 'issued-tokens.log');

  assert.equal(fs.existsSync(issuedTokensFilePath), true);

  const content = fs.readFileSync(issuedTokensFilePath, 'utf8');

  assert.match(content, /"username":"alice"/);
  assert.match(content, /"tokenFingerprint":"abcd1234abcd1234"/);
});

test('creates a session log folder with date and time in its name', () => {
  logger.info('Relay request completed.', { statusCode: 200 });

  const entries = fs.readdirSync(logsRootPath, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  assert.equal(directories.length, 1);
  assert.match(directories[0], /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);

  const infoLogPath = path.join(logsRootPath, directories[0], 'info.log');

  assert.equal(fs.existsSync(infoLogPath), true);
});
