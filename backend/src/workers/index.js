const { startWorkers } = require('./queues');
const logger = require('../utils/logger');

logger.info('Starting Codex POS workers...');
startWorkers();
