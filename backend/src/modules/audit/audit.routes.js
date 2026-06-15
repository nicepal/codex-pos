const router = require('express').Router();
const controller = require('./audit.controller');
const { authenticate, requirePlatformAdmin } = require('../../middleware/auth');

router.use(authenticate, requirePlatformAdmin);
router.get('/', controller.list);

module.exports = router;
