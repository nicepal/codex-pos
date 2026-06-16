const { FEATURE_PACKS, PACK_KEYS, normalizeFeatures, isFeatureEnabled } = require('../../src/shared/features');

describe('features', () => {
  test('PACK_KEYS match FEATURE_PACKS', () => {
    expect(PACK_KEYS).toEqual(Object.keys(FEATURE_PACKS));
  });

  test('normalizeFeatures keeps only boolean pack keys', () => {
    const out = normalizeFeatures({ pos_pro: true, foo: 'bar', catalog_pro: false });
    expect(out).toEqual({ pos_pro: true, catalog_pro: false });
  });

  test('isFeatureEnabled', () => {
    expect(isFeatureEnabled({ pos_pro: true }, 'pos_pro')).toBe(true);
    expect(isFeatureEnabled({ pos_pro: false }, 'pos_pro')).toBe(false);
  });
});
