const router = require('express').Router();
const controller = require('./reports.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.reports', 'business.dashboard'));

router.get('/dashboard', controller.dashboard);
router.get('/dashboard-overview', controller.dashboardOverview);
router.get('/sales', controller.sales);
router.get('/top-products', controller.topProducts);
router.get('/inventory', controller.inventory);
router.get('/financial', controller.financial);
router.get('/advanced', controller.advanced);
router.get('/export/sales', controller.exportSales);
router.post('/schedule', controller.scheduleReport);
router.get('/export/data', controller.exportData);

module.exports = router;
