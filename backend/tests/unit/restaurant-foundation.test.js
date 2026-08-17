const {
  mergeRestaurantSettings,
  canOpenTable,
  canCloseSession,
  resolvePostCloseTableStatus,
  DEFAULT_RESTAURANT_SETTINGS,
} = require('../../src/modules/restaurant/restaurant.helpers');

describe('Restaurant foundation helpers', () => {
  describe('mergeRestaurantSettings', () => {
    test('returns defaults when stored is empty', () => {
      expect(mergeRestaurantSettings()).toEqual(DEFAULT_RESTAURANT_SETTINGS);
    });

    test('merges known keys and preserves default_floor_id', () => {
      const merged = mergeRestaurantSettings({
        default_guest_count: 4,
        show_capacity_on_floor_plan: false,
        default_floor_id: 'f1',
        unknown: true,
      });
      expect(merged.default_guest_count).toBe(4);
      expect(merged.show_capacity_on_floor_plan).toBe(false);
      expect(merged.default_floor_id).toBe('f1');
      expect(merged.unknown).toBeUndefined();
    });
  });

  describe('canOpenTable', () => {
    test('allows available table with no session', () => {
      expect(canOpenTable('available', false)).toEqual({ ok: true });
    });

    test('allows cleaning table with no session', () => {
      expect(canOpenTable('cleaning', false)).toEqual({ ok: true });
    });

    test('rejects when active session exists', () => {
      const result = canOpenTable('available', true);
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/active session/i);
    });

    test('rejects occupied table', () => {
      const result = canOpenTable('occupied', false);
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/occupied/i);
    });

    test('rejects reserved table', () => {
      const result = canOpenTable('reserved', false);
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/reserved/i);
    });
  });

  describe('canCloseSession', () => {
    test('allows open session', () => {
      expect(canCloseSession({ status: 'open' })).toEqual({ ok: true });
    });

    test('rejects missing session', () => {
      const result = canCloseSession(null);
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/not found/i);
    });

    test('rejects already closed session', () => {
      const result = canCloseSession({ status: 'closed' });
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/not open/i);
    });
  });

  describe('resolvePostCloseTableStatus', () => {
    test('defaults to available', () => {
      expect(resolvePostCloseTableStatus({})).toBe('available');
    });

    test('honors cleaning preference', () => {
      expect(resolvePostCloseTableStatus({ post_close_table_status: 'cleaning' })).toBe('cleaning');
    });
  });
});
