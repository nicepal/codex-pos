const rateLimit = require('express-rate-limit');
const config = require('../config');

const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts. Please try again later.',
  },
});

module.exports = { authRateLimiter };
