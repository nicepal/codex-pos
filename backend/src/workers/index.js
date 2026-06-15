const { startWorkers } = require('./queues');
const logger = require('../utils/logger');

logger.info('Starting EYZ POS workers...');
startWorkers();
