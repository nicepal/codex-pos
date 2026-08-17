const router = require('express').Router();
const controller = require('./sso.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');

router.use(
  authenticate,
  requireTenant,
  requireTenantAccess,
  requireFeature('enterprise')
);

router.get('/config', authorize('business.settings'), controller.getConfig);
router.put('/config', authorize('business.settings'), controller.upsertConfig);
router.get('/authorize', authorize('business.settings'), controller.authorize);
router.post('/callback', authorize('business.settings'), controller.callback);

// SCIM 2.0 stubs
router.get('/scim/v2/Users', authorize('business.settings', 'business.employees'), controller.listScimUsers);
router.post('/scim/v2/Users', authorize('business.settings', 'business.employees'), controller.createScimUser);

module.exports = router;
