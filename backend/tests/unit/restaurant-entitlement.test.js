const {
  getBusinessTypeEntitlements,
  clampFeaturesToPlan,
  stripClientProtectedFeatures,
  CLIENT_PROTECTED_FEATURE_KEYS,
  PLAN_DEFAULTS,
} = require('../../src/shared/features');
const {
  isRestaurantBusinessType,
  isPosBusinessType,
  RESTAURANT_BUSINESS_TYPES,
  POS_BUSINESS_TYPES,
} = require('../../src/modules/onboarding/business-types');
const { DEFAULT_RESTAURANT_SETTINGS } = require('../../src/modules/restaurant/restaurant.helpers');

describe('Business type feature entitlements', () => {
  describe('isPosBusinessType', () => {
    test('all onboarding business types qualify', () => {
      expect(POS_BUSINESS_TYPES).toEqual([
        'retail', 'restaurant', 'grocery', 'fashion', 'electronics',
        'beauty', 'pharmacy', 'wholesale', 'general',
      ]);
      for (const type of POS_BUSINESS_TYPES) {
        expect(isPosBusinessType(type)).toBe(true);
      }
    });

    test('unknown type does not qualify', () => {
      expect(isPosBusinessType('platform')).toBe(false);
      expect(isPosBusinessType(null)).toBe(false);
    });
  });

  describe('isRestaurantBusinessType', () => {
    test('restaurant qualifies', () => {
      expect(isRestaurantBusinessType('restaurant')).toBe(true);
    });

    test('cafe is covered by restaurant id (Restaurant / Cafe label)', () => {
      expect(RESTAURANT_BUSINESS_TYPES).toContain('restaurant');
    });

    test('retail does not qualify', () => {
      expect(isRestaurantBusinessType('retail')).toBe(false);
    });

    test('grocery does not qualify', () => {
      expect(isRestaurantBusinessType('grocery')).toBe(false);
    });
  });

  describe('getBusinessTypeEntitlements', () => {
    test('restaurant gets pos_pro and restaurant_pro', () => {
      expect(getBusinessTypeEntitlements('restaurant')).toEqual({
        pos_pro: true,
        restaurant_pro: true,
      });
    });

    test('retail gets pos_pro only', () => {
      expect(getBusinessTypeEntitlements('retail')).toEqual({ pos_pro: true });
    });

    test('grocery gets pos_pro only', () => {
      expect(getBusinessTypeEntitlements('grocery')).toEqual({ pos_pro: true });
    });

    test('unknown type gets no entitlements', () => {
      expect(getBusinessTypeEntitlements(null)).toEqual({});
      expect(getBusinessTypeEntitlements('invalid')).toEqual({});
    });
  });

  describe('clampFeaturesToPlan with business type entitlements', () => {
    test('restaurant business can enable restaurant_pro on starter plan', () => {
      const planFeatures = PLAN_DEFAULTS.starter;
      const { clamped, capped } = clampFeaturesToPlan(
        planFeatures,
        { restaurant_pro: true },
        'restaurant'
      );
      expect(capped).not.toContain('restaurant_pro');
      expect(clamped.restaurant_pro).toBeUndefined();
    });

    test('restaurant business can enable pos_pro on starter plan', () => {
      const planFeatures = PLAN_DEFAULTS.starter;
      const { clamped, capped } = clampFeaturesToPlan(
        planFeatures,
        { pos_pro: true },
        'restaurant'
      );
      expect(capped).not.toContain('pos_pro');
      expect(clamped.pos_pro).toBeUndefined();
    });

    test('retail business cannot enable restaurant_pro via client override path', () => {
      const stripped = stripClientProtectedFeatures({ restaurant_pro: true, pos_pro: true });
      expect(stripped.restaurant_pro).toBeUndefined();
      expect(stripped.pos_pro).toBeUndefined();
      const { capped } = clampFeaturesToPlan(PLAN_DEFAULTS.starter, stripped, 'retail');
      expect(capped).not.toContain('restaurant_pro');
    });

    test('retail gets pos_pro via entitlement even on starter plan', () => {
      const planFeatures = PLAN_DEFAULTS.starter;
      const { capped } = clampFeaturesToPlan(planFeatures, { pos_pro: true }, 'retail');
      expect(capped).not.toContain('pos_pro');
    });
  });

  describe('stripClientProtectedFeatures', () => {
    test('removes protected features from client payload', () => {
      expect(stripClientProtectedFeatures({
        restaurant_pro: true,
        pos_pro: true,
        catalog_pro: true,
      })).toEqual({ catalog_pro: true });
    });

    test('CLIENT_PROTECTED_FEATURE_KEYS includes pos_pro and restaurant_pro', () => {
      expect(CLIENT_PROTECTED_FEATURE_KEYS).toContain('restaurant_pro');
      expect(CLIENT_PROTECTED_FEATURE_KEYS).toContain('pos_pro');
    });
  });

  describe('DEFAULT_RESTAURANT_SETTINGS', () => {
    test('includes required defaults for auto-init', () => {
      expect(DEFAULT_RESTAURANT_SETTINGS).toMatchObject({
        default_guest_count: 2,
        show_capacity_on_floor_plan: true,
        post_close_table_status: 'available',
        enable_reservations: false,
        default_floor_id: null,
      });
    });
  });
});
