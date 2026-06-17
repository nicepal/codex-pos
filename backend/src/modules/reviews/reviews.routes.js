const router = require('express').Router();
const controller = require('./reviews.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { auditLog } = require('../../middleware/audit');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.products'));

router.get('/', controller.list);
router.patch('/:id', auditLog('review.moderate', 'review'), controller.moderate);
router.delete('/:id', auditLog('review.delete', 'review'), controller.remove);

module.exports = router;
