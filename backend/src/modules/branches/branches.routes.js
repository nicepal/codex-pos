const router = require('express').Router();
const controller = require('./branches.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validate');
const { createBranchSchema, updateBranchSchema } = require('./branches.validation');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.settings'));

router.get('/', controller.list);
router.post('/bulk-delete', controller.bulkRemove);
router.get('/:id', controller.getById);
router.post('/', validate(createBranchSchema), controller.create);
router.put('/:id', validate(updateBranchSchema), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
