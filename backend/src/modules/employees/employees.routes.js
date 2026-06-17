const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../../config/database');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');
const { asyncHandler } = require('../../middleware/errorHandler');
const { success } = require('../../shared/response');
const { ValidationError, NotFoundError } = require('../../shared/errors');
const crudModules = require('../_crud');

const router = express.Router();
const { controller, permission } = crudModules.employees;

async function hashEmployeePin(req, res, next) {
  try {
    if (req.body?.pin_code) {
      req.body.pin_code = await bcrypt.hash(String(req.body.pin_code), 10);
    }
    next();
  } catch (err) {
    next(err);
  }
}

router.use(authenticate, requireTenant, requireTenantAccess, authorize(permission));

router.post('/verify-pin', requireFeature('staff_pro'), asyncHandler(async (req, res) => {
  const { employee_id: employeeId, pin } = req.body;
  if (!employeeId || !pin) throw new ValidationError('employee_id and pin are required');

  const result = await db.query(
    `SELECT id, pin_code, first_name, last_name FROM employees
     WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
    [employeeId, req.tenant.id]
  );
  const employee = result.rows[0];
  if (!employee?.pin_code) throw new NotFoundError('Employee PIN not configured');

  const valid = await bcrypt.compare(String(pin), employee.pin_code);
  if (!valid) throw new ValidationError('Invalid manager PIN');

  return success(res, {
    employee_id: employee.id,
    name: `${employee.first_name} ${employee.last_name}`.trim(),
    verified: true,
  }, 'PIN verified');
}));

router.get('/', controller.list);
router.post('/bulk-delete', controller.bulkRemove);
router.get('/:id', controller.getById);
router.post('/', requireFeature('staff_pro'), hashEmployeePin, controller.create);
router.put('/:id', requireFeature('staff_pro'), hashEmployeePin, controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
