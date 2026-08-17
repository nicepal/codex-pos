const router = require('express').Router();
const controller = require('./shifts.controller');
const { authenticate, requireTenantAccess, authorize } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');

router.use(authenticate, requireTenant, requireTenantAccess, requireFeature('staff_pro'));

router.get('/', authorize('business.employees'), controller.list);
router.get('/current', authorize('business.employees', 'business.pos'), controller.current);
router.post('/clock-in', authorize('business.pos', 'business.employees'), controller.clockIn);
router.post('/:id/clock-out', authorize('business.pos', 'business.employees'), controller.clockOut);
router.get('/:id/x-report', authorize('business.reports', 'business.employees', 'business.pos'), controller.xReport);
router.get('/:id/z-report', authorize('business.reports', 'business.employees', 'business.pos'), controller.zReport);

module.exports = router;
