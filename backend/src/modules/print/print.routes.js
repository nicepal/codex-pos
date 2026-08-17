const router = require('express').Router();
const controller = require('./print.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');

router.use(authenticate, requireTenant, requireTenantAccess);

router.post('/receipts', authorize('business.pos', 'business.orders'), controller.createReceipt);
router.get('/jobs', authorize('business.pos', 'business.orders', 'business.settings'), controller.listJobs);
router.post('/jobs/claim', authorize('business.pos', 'business.orders', 'business.settings'), controller.claimNext);
router.post('/jobs/:id/complete', authorize('business.pos', 'business.orders', 'business.settings'), controller.completeJob);
router.post('/jobs/:id/fail', authorize('business.pos', 'business.orders', 'business.settings'), controller.failJob);

module.exports = router;
