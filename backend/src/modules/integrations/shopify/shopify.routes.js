const router = require('express').Router();
const controller = require('./shopify.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../../middleware/auth');
const { requireTenant } = require('../../../middleware/tenant');
const { validate } = require('../../../middleware/validate');
const { auditLog } = require('../../../middleware/audit');
const { connectSchema, importSchema } = require('./shopify.validation');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.settings'));

router.get('/status', controller.status);
router.post('/connect', validate(connectSchema), auditLog('shopify.connect', 'integration'), controller.connect);
router.delete('/disconnect', auditLog('shopify.disconnect', 'integration'), controller.disconnect);
router.post('/import', validate(importSchema), auditLog('shopify.import', 'integration'), controller.import);
router.post('/sync', auditLog('shopify.sync', 'integration'), controller.sync);
router.get('/jobs', controller.listJobs);
router.get('/jobs/:id', controller.getJob);

module.exports = router;
