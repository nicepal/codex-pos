const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

let redis = null;

function getRedis() {
  if (!redis) {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    redis.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message });
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });
  }
  return redis;
}

module.exports = { getRedis };
