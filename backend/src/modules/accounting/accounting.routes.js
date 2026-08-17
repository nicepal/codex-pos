const router = require('express').Router();
const controller = require('./accounting.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');

router.use(
  authenticate,
  requireTenant,
  requireTenantAccess,
  requireFeature('finance_pro'),
  authorize('business.reports', 'business.settings', 'business.expenses')
);

router.get('/accounts', controller.listAccounts);
router.post('/accounts', controller.createAccount);
router.post('/journals', controller.createJournal);
router.get('/journals', controller.listJournals);
router.get('/reports/profit-loss', controller.profitLoss);
router.get('/reports/balance-sheet', controller.balanceSheet);
router.get('/reports/cash-flow', controller.cashFlow);
router.get('/reports/tax', controller.taxReport);
router.get('/exchange-rates', controller.listExchangeRates);
router.post('/exchange-rates', controller.upsertExchangeRate);

module.exports = router;
