const router = require('express').Router();
const controller = require('./brands.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { auditLog } = require('../../middleware/audit');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.products'));

router.get('/', controller.list);
router.post('/bulk-delete', auditLog('brand.delete', 'brand'), controller.bulkRemove);
router.get('/:id', controller.getById);
router.post('/', auditLog('brand.create', 'brand'), controller.create);
router.put('/:id', auditLog('brand.update', 'brand'), controller.update);
router.delete('/:id', auditLog('brand.delete', 'brand'), controller.remove);

module.exports = router;
