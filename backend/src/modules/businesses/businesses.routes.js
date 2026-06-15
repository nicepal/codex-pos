const router = require('express').Router();
const controller = require('./businesses.controller');
const { authenticate, requirePlatformAdmin } = require('../../middleware/auth');
const { auditLog } = require('../../middleware/audit');
const { validate } = require('../../middleware/validate');
const { createBusinessSchema } = require('./businesses.validation');
const { asyncHandler } = require('../../middleware/errorHandler');

router.use(authenticate, requirePlatformAdmin);

router.get('/dashboard', controller.dashboard);
router.get('/charts', controller.charts);
router.get('/', controller.list);
router.post('/', auditLog('business.create', 'tenant'), validate(createBusinessSchema), controller.create);
router.get('/invoices/all', asyncHandler(async (req, res) => {
  const businessService = require('./businesses.service');
  const { paginated } = require('../../shared/response');
  const result = await businessService.getInvoices(null, req.query);
  return paginated(res, result.rows, result.pagination);
}));

router.get('/:id/invoices', controller.invoices);
router.post('/:id/upgrade-plan', auditLog('business.upgrade_plan', 'tenant'), controller.upgradePlan);
router.get('/:id', controller.getById);
router.put('/:id', auditLog('business.update', 'tenant'), controller.update);
router.post('/:id/suspend', auditLog('business.suspend', 'tenant'), controller.suspend);
router.post('/:id/activate', auditLog('business.activate', 'tenant'), controller.activate);
router.post('/:id/extend-trial', auditLog('business.extend_trial', 'tenant'), controller.extendTrial);
router.delete('/:id', auditLog('business.delete', 'tenant'), controller.remove);

module.exports = router;
