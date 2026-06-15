const router = require('express').Router();
const controller = require('./billing.controller');
const { authenticate, requirePlatformAdmin } = require('../../middleware/auth');

router.use(authenticate, requirePlatformAdmin);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.post('/:id/mark-paid', controller.markPaid);
router.post('/:id/cancel', controller.cancel);

module.exports = router;
