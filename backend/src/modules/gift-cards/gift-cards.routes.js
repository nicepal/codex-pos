const router = require('express').Router();
const controller = require('./gift-cards.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { auditLog } = require('../../middleware/audit');

router.use(authenticate, requireTenant, requireTenantAccess);

router.get('/', authorize('business.pos', 'business.settings'), controller.list);
router.get('/balance/:code', authorize('business.pos', 'business.settings'), controller.checkBalance);
router.post('/', authorize('business.settings'), auditLog('gift_card.issue', 'gift_card'), controller.issue);
router.post('/redeem', authorize('business.pos', 'business.settings'), auditLog('gift_card.redeem', 'gift_card'), controller.redeem);
router.get('/:id/transactions', authorize('business.pos', 'business.settings'), controller.transactions);
router.delete('/:id', authorize('business.settings'), auditLog('gift_card.deactivate', 'gift_card'), controller.deactivate);

module.exports = router;
