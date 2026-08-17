const {
  shouldEnforceRegisterSession,
  validateRegisterSessionState,
  pickDrawerForBranch,
  parsePreferenceValue,
} = require('../../src/modules/orders/orders.register-gate');

describe('POS register gate (orders.register-gate)', () => {
  const staffProFeatures = { staff_pro: true };
  const noStaffPro = { staff_pro: false };

  describe('shouldEnforceRegisterSession', () => {
    test('enforces for POS sale when staff_pro and register required', () => {
      expect(shouldEnforceRegisterSession({
        features: staffProFeatures,
        preferences: { require_register_session: true },
        orderType: 'pos',
        status: 'paid',
      })).toBe(true);
    });

    test('skips on_hold orders', () => {
      expect(shouldEnforceRegisterSession({
        features: staffProFeatures,
        preferences: {},
        orderType: 'pos',
        status: 'on_hold',
      })).toBe(false);
    });

    test('skips online/storefront orders', () => {
      expect(shouldEnforceRegisterSession({
        features: staffProFeatures,
        preferences: {},
        orderType: 'online',
        status: 'paid',
      })).toBe(false);
    });

    test('skips when staff_pro disabled', () => {
      expect(shouldEnforceRegisterSession({
        features: noStaffPro,
        preferences: {},
        orderType: 'pos',
        status: 'paid',
      })).toBe(false);
    });

    test('skips when require_register_session explicitly false', () => {
      expect(shouldEnforceRegisterSession({
        features: staffProFeatures,
        preferences: { require_register_session: false },
        orderType: 'pos',
        status: 'paid',
      })).toBe(false);
    });
  });

  describe('validateRegisterSessionState', () => {
    const shift = { id: 's1', employee_id: 'e1', branch_id: 'b1', drawer_session_id: 'd1' };
    const drawer = { id: 'd1', branch_id: 'b1', status: 'open' };

    test('passes when shift and drawer are open and linked', () => {
      expect(validateRegisterSessionState({
        shift, drawer, employeeId: 'e1', branchId: 'b1',
      })).toEqual({ ok: true });
    });

    test('rejects missing drawer', () => {
      const r = validateRegisterSessionState({ shift, drawer: null, employeeId: 'e1', branchId: 'b1' });
      expect(r.ok).toBe(false);
      expect(r.message).toMatch(/drawer/i);
    });

    test('rejects missing shift', () => {
      const r = validateRegisterSessionState({ shift: null, drawer, employeeId: 'e1', branchId: 'b1' });
      expect(r.ok).toBe(false);
      expect(r.message).toMatch(/shift/i);
    });

    test('rejects employee mismatch', () => {
      const r = validateRegisterSessionState({
        shift, drawer, employeeId: 'other', branchId: 'b1',
      });
      expect(r.ok).toBe(false);
      expect(r.message).toMatch(/employee_id/i);
    });

    test('rejects unlinked shift drawer', () => {
      const r = validateRegisterSessionState({
        shift: { ...shift, drawer_session_id: 'other' },
        drawer,
        employeeId: 'e1',
        branchId: 'b1',
      });
      expect(r.ok).toBe(false);
      expect(r.message).toMatch(/linked/i);
    });
  });

  describe('pickDrawerForBranch', () => {
    test('selects branch-specific drawer', () => {
      const rows = [
        { id: 'd1', branch_id: 'b1' },
        { id: 'd2', branch_id: 'b2' },
      ];
      expect(pickDrawerForBranch(rows, 'b2')?.id).toBe('d2');
    });

    test('selects null-branch drawer for default branch', () => {
      const rows = [
        { id: 'd1', branch_id: 'b1' },
        { id: 'd2', branch_id: null },
      ];
      expect(pickDrawerForBranch(rows, null)?.id).toBe('d2');
    });
  });

  describe('parsePreferenceValue', () => {
    test('parses JSON boolean strings', () => {
      expect(parsePreferenceValue('false', true)).toBe(false);
    });

    test('returns default when missing', () => {
      expect(parsePreferenceValue(null, true)).toBe(true);
    });
  });
});
