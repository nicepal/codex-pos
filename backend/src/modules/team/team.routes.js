const router = require('express').Router();
const controller = require('./team.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.employees'));

router.get('/', controller.list);
router.post('/bulk-delete', authorize('business.settings'), controller.bulkRemove);
router.post('/invite', authorize('business.settings'), controller.invite);
router.put('/:userId/role', authorize('business.settings'), controller.updateRole);
router.delete('/:userId', authorize('business.settings'), controller.remove);

module.exports = router;
