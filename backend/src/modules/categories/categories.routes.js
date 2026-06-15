const router = require('express').Router();
const controller = require('./categories.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { auditLog } = require('../../middleware/audit');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.categories'));

router.get('/', controller.list);
router.post('/bulk-delete', auditLog('category.delete', 'category'), controller.bulkRemove);
router.get('/:id', controller.getById);
router.post('/', auditLog('category.create', 'category'), controller.create);
router.put('/:id', auditLog('category.update', 'category'), controller.update);
router.delete('/:id', auditLog('category.delete', 'category'), controller.remove);

module.exports = router;
