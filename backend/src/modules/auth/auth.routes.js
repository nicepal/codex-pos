const router = require('express').Router();
const controller = require('./auth.controller');
const { validate } = require('../../middleware/validate');
const { authenticate, requirePlatformAdmin } = require('../../middleware/auth');
const { authRateLimiter } = require('../../middleware/rateLimit');
const schemas = require('./auth.validation');

router.post('/register', authRateLimiter, validate(schemas.registerSchema), controller.register);
router.post('/login', authRateLimiter, validate(schemas.loginSchema), controller.login);
router.post('/refresh', authRateLimiter, validate(schemas.refreshSchema), controller.refresh);
router.post('/logout', controller.logout);
router.post('/forgot-password', authRateLimiter, validate(schemas.forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', authRateLimiter, validate(schemas.resetPasswordSchema), controller.resetPassword);
router.get('/me', authenticate, controller.me);
router.post('/impersonate', authenticate, requirePlatformAdmin, controller.impersonate);
router.post('/mfa/setup', authenticate, controller.setupMfa);
router.post('/mfa/enable', authenticate, controller.enableMfa);
router.post('/mfa/disable', authenticate, validate(schemas.disableMfaSchema), controller.disableMfa);

module.exports = router;
