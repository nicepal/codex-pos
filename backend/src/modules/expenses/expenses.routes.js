const router = require('express').Router();
const controller = require('./expenses.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validate');
const { auditLog } = require('../../middleware/audit');
const { createExpenseSchema, updateExpenseSchema, importExpenseSchema } = require('./expenses.validation');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.expenses'));

router.get('/dashboard', controller.dashboard);
router.get('/export', controller.exportCsv);
router.post('/import', validate(importExpenseSchema), controller.importCsv);
router.get('/', controller.list);
router.post('/bulk-delete', auditLog('expense.delete', 'expense'), controller.bulkRemove);
router.get('/:id', controller.getById);
router.post('/', auditLog('expense.create', 'expense'), validate(createExpenseSchema), controller.create);
router.put('/:id', auditLog('expense.update', 'expense'), validate(updateExpenseSchema), controller.update);
router.delete('/:id', auditLog('expense.delete', 'expense'), controller.remove);

module.exports = router;
