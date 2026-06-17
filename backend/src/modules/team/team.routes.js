const router = require('express').Router();
const controller = require('./team.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validate');
const { inviteTeamSchema, updateRoleSchema } = require('./team.validation');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.employees'));

router.get('/', controller.list);
router.post('/bulk-delete', controller.bulkRemove);
router.post('/invite', validate(inviteTeamSchema), controller.invite);
router.put('/:userId/role', validate(updateRoleSchema), controller.updateRole);
router.delete('/:userId', controller.remove);

module.exports = router;
