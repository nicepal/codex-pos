const { isFeatureEnabled } = require('../../shared/features');

/** Parse settings.value column (JSON string or primitive). */
function parsePreferenceValue(raw, defaultValue) {
  if (raw == null) return defaultValue;
  if (typeof raw === 'boolean' || typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

/**
 * Whether POST /orders must have an open shift + cash drawer (mirrors POS.jsx RegisterGate).
 */
function shouldEnforceRegisterSession({ features, preferences, orderType, status }) {
  if (status === 'on_hold') return false;
  const type = orderType || 'pos';
  if (type !== 'pos') return false;
  if (!isFeatureEnabled(features, 'staff_pro')) return false;
  if (preferences?.require_register_session === false) return false;
  return true;
}

/**
 * Pure validation of shift + drawer state (unit-testable).
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
function validateRegisterSessionState({ shift, drawer, employeeId, branchId }) {
  if (!drawer) {
    return { ok: false, message: 'No open cash drawer session for this branch. Open the register first.' };
  }
  if (!shift) {
    return { ok: false, message: 'No open shift. Clock in before completing sales.' };
  }
  if (employeeId && shift.employee_id !== employeeId) {
    return { ok: false, message: 'employee_id does not match the open shift for this cashier.' };
  }
  if (branchId != null && shift.branch_id != null && shift.branch_id !== branchId) {
    return { ok: false, message: 'Open shift is for a different branch.' };
  }
  if (branchId != null && drawer.branch_id != null && drawer.branch_id !== branchId) {
    return { ok: false, message: 'Open cash drawer is for a different branch.' };
  }
  if (shift.drawer_session_id && shift.drawer_session_id !== drawer.id) {
    return { ok: false, message: 'Open shift is not linked to the open cash drawer.' };
  }
  return { ok: true };
}

/** Pick the drawer row that matches branch semantics used in POS.jsx. */
function pickDrawerForBranch(openDrawers, branchId) {
  if (!openDrawers?.length) return null;
  if (branchId) {
    return openDrawers.find((d) => d.branch_id === branchId) || null;
  }
  return openDrawers.find((d) => d.branch_id == null) || openDrawers[0];
}

module.exports = {
  parsePreferenceValue,
  shouldEnforceRegisterSession,
  validateRegisterSessionState,
  pickDrawerForBranch,
};
