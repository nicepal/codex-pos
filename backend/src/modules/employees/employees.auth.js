const db = require('../../config/database');
const bcrypt = require('bcryptjs');
const { ValidationError, NotFoundError } = require('../../shared/errors');

/**
 * Verify manager PIN for protected POS actions (discount, void, price override, etc.).
 */
async function verifyManagerPin(tenantId, employeeId, pin) {
  if (!employeeId || !pin) {
    throw new ValidationError('Manager employee_id and pin are required');
  }
  const result = await db.query(
    `SELECT id, pin_code, name FROM employees
     WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
    [employeeId, tenantId]
  );
  const employee = result.rows[0];
  if (!employee?.pin_code) throw new NotFoundError('Manager PIN not configured');
  const valid = await bcrypt.compare(String(pin), employee.pin_code);
  if (!valid) throw new ValidationError('Invalid manager PIN');
  return { employee_id: employee.id, name: employee.name };
}

module.exports = { verifyManagerPin };
