import fs from 'node:fs';
import path from 'node:path';

const isTestEnvironment = process.env.NODE_ENV === 'test';
const logsRootPath = process.env.RELAY_LOGS_DIR || path.join(process.cwd(), 'logs');

const pad = (value) => String(value).padStart(2, '0');

const formatSessionFolderName = (date) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
};

const logSessionFolderName = formatSessionFolderName(new Date());

const resolveSessionLogFilePath = (level) => {
  const logsFolderPath = path.join(logsRootPath, logSessionFolderName);
  const fileName = level === 'error' || level === 'fatal' ? 'error.log' : 'info.log';

  fs.mkdirSync(logsFolderPath, { recursive: true });

  return path.join(logsFolderPath, fileName);
};

const resolveIssuedTokensLogPath = () => {
  fs.mkdirSync(logsRootPath, { recursive: true });

  return path.join(logsRootPath, 'issued-tokens.log');
};

const normalizeError = (error) => {
  if (!(error instanceof Error)) {
    return error;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
};

const normalizeMeta = (meta) => {
  if (!meta || typeof meta !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => [
      key,
      value instanceof Error ? normalizeError(value) : value,
    ]),
  );
};

const writeOutput = (level, output) => {
  if (level === 'error' || level === 'fatal') {
    console.error(output);

    return;
  }

  console.log(output);
};

const writeEntry = (level, message, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...normalizeMeta(meta),
  };

  const output = JSON.stringify(entry);

  if (!isTestEnvironment) {
    const destinationPath = resolveSessionLogFilePath(level);

    fs.appendFileSync(destinationPath, `${output}\n`);
  }

  writeOutput(level, output);
};

const writeIssuedTokenEntry = (meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    event: 'issued-token',
    ...normalizeMeta(meta),
  };

  const output = JSON.stringify(entry);

  if (!isTestEnvironment) {
    const destinationPath = resolveIssuedTokensLogPath();

    fs.appendFileSync(destinationPath, `${output}\n`);
  }

  console.log(output);
};

const logger = {
  info: (message, meta) => writeEntry('info', message, meta),
  warn: (message, meta) => writeEntry('warn', message, meta),
  error: (message, meta) => writeEntry('error', message, meta),
  fatal: (message, meta) => writeEntry('fatal', message, meta),
  issuedToken: (meta) => writeIssuedTokenEntry(meta),
};

process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught exception detected.', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal('Unhandled promise rejection detected.', { reason });
});

export default logger;
