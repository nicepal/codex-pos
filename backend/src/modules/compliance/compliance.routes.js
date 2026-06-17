const router = require('express').Router();
const controller = require('./compliance.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { auditLog } = require('../../middleware/audit');

router.use(authenticate, requireTenant, requireTenantAccess);

// Fiscal tax invoice (PDF) for an order
router.get('/orders/:orderId/tax-invoice', authorize('business.orders', 'business.reports'), controller.taxInvoice);

// GDPR data subject tooling
router.get('/gdpr/customers/:customerId/export', authorize('business.customers', 'business.settings'), auditLog('gdpr.export', 'customer'), controller.gdprExport);
router.post('/gdpr/customers/:customerId/erase', authorize('business.settings'), auditLog('gdpr.erase', 'customer'), controller.gdprErase);

module.exports = router;
