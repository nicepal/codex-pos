const router = require('express').Router();
const controller = require('./tickets.controller');
const { authenticate, requirePlatformAdmin, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireTicketAccess } = require('../../middleware/ticketAccess');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', requireTicketAccess(), controller.getById);
router.post('/', requireTenant, requireTenantAccess, controller.create);
router.post('/:id/reply', requireTicketAccess(), controller.reply);
router.post('/:id/assign', requirePlatformAdmin, requireTicketAccess(), controller.assign);
router.post('/:id/close', requireTicketAccess(), controller.close);
router.post('/:id/resolve', requireTicketAccess(), controller.resolve);
router.post('/:id/reopen', requireTicketAccess(), controller.reopen);

module.exports = router;
