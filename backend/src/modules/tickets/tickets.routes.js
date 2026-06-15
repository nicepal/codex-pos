const router = require('express').Router();
const controller = require('./tickets.controller');
const { authenticate, requirePlatformAdmin, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', requireTenant, requireTenantAccess, controller.create);
router.post('/:id/reply', controller.reply);
router.post('/:id/assign', requirePlatformAdmin, controller.assign);
router.post('/:id/close', controller.close);
router.post('/:id/resolve', controller.resolve);
router.post('/:id/reopen', controller.reopen);

module.exports = router;
