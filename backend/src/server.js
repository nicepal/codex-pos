const http = require('http');
const { createApp } = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { formatError } = logger;
const db = require('./config/database');
const { initRealtime } = require('./realtime/socket');

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', formatError(reason));
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', formatError(err));
  process.exit(1);
});

const app = createApp();
const server = http.createServer(app);

async function start() {
  try {
    if (!config.jwt.accessSecret || !config.jwt.refreshSecret) {
      logger.error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required');
      process.exit(1);
    }
    if (!config.upload.signingSecret) {
      logger.error('UPLOAD_SIGNING_SECRET or JWT_ACCESS_SECRET is required for signed media URLs');
      process.exit(1);
    }
    if (!config.payments.webhookSecret && config.env === 'production') {
      logger.warn('PAYMENT_WEBHOOK_SECRET is not set — payment webhooks will be rejected');
    }

    try {
      await db.query('SELECT 1');
    } catch (err) {
      logger.error(
        `Postgres unreachable at ${config.db.host}:${config.db.port} (database ${config.db.database}). `
          + 'Start Docker Desktop, then: docker compose up -d postgres redis',
        formatError(err)
      );
      process.exit(1);
    }
    logger.info('Database connected');

    initRealtime(server);

    server.listen(config.port, () => {
      logger.info(`${config.app.name} API running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`API: http://localhost:${config.port}${config.apiPrefix}`);
    });
  } catch (err) {
    logger.error('Failed to start server', formatError(err));
    process.exit(1);
  }
}

start();

module.exports = app;
