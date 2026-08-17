const router = require('express').Router();
const controller = require('./ai.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.reports'));

router.get('/reorder-suggestions', requireFeature('ai_pro'), controller.reorder);
router.post('/insights', requireFeature('ai_pro'), controller.ask);

router.post('/forecast', requireFeature('ai_pro'), controller.forecast);
router.post('/product-description', requireFeature('ai_pro'), controller.productDescription);
router.post('/generate-email', requireFeature('ai_pro'), controller.generateEmail);
router.post('/chat', requireFeature('ai_pro'), controller.chatSupport);

module.exports = router;
