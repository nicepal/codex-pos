const { createApp } = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const db = require('./config/database');

const app = createApp();

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

    await db.query('SELECT 1');
    logger.info('Database connected');

    app.listen(config.port, () => {
      logger.info(`${config.app.name} API running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`API: http://localhost:${config.port}${config.apiPrefix}`);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

start();

module.exports = app;
