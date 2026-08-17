const router = require('express').Router();
const controller = require('./custom-roles.controller');
const { authenticate, requireTenantAccess, authorize } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');

router.use(authenticate, requireTenant, requireTenantAccess, requireFeature('enterprise'), authorize('business.employees'));

router.get('/', controller.list);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/assign', controller.assign);
router.post('/unassign', controller.unassign);

module.exports = router;
