const winston = require('winston');
const config = require('../config');

/** Serialize Errors including Node AggregateError (ECONNREFUSED often has empty message). */
function formatError(err) {
  if (err == null) return { error: 'unknown' };
  if (typeof err === 'string') return { error: err };
  const causes = Array.isArray(err.errors)
    ? err.errors.map((e) => ({
        message: e.message || '',
        code: e.code,
        address: e.address,
        port: e.port,
        syscall: e.syscall,
      }))
    : undefined;
  const fromCauses = causes
    ?.map((c) => c.message || [c.code, c.address, c.port].filter(Boolean).join(' '))
    .filter(Boolean)
    .join('; ');
  return {
    error: err.message || err.code || fromCauses || String(err),
    name: err.name,
    code: err.code,
    stack: err.stack,
    ...(causes ? { causes } : {}),
  };
}

const logger = winston.createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'codexpos-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        })
      ),
    }),
  ],
});

logger.formatError = formatError;
module.exports = logger;
