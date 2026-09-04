/**
 * PosHive onboarding — supported business types (UI labels + copy).
 * Keys must match tenants.business_type CHECK constraint.
 */

const POS_FEATURE_PACKS = ['pos_pro'];

const BUSINESS_TYPES = [
  {
    id: 'retail',
    label: 'Retail Store',
    description: 'General merchandise, gifts, and everyday retail products.',
    icon: 'storefront',
    estimatedProducts: 12,
    estimatedCategories: 4,
    includesFeaturePacks: [...POS_FEATURE_PACKS],
  },
  {
    id: 'restaurant',
    label: 'Restaurant / Cafe',
    description: 'Menu items for cafes, quick service, and casual dining. POS Pro and Restaurant Pro (tables, floor plans, KDS) are included automatically.',
    icon: 'restaurant',
    estimatedProducts: 12,
    estimatedCategories: 4,
    includesFeaturePacks: [...POS_FEATURE_PACKS, 'restaurant_pro'],
  },
  {
    id: 'grocery',
    label: 'Grocery / Convenience',
    description: 'Pantry staples, drinks, and everyday essentials.',
    icon: 'local_grocery_store',
    estimatedProducts: 12,
    estimatedCategories: 4,
    includesFeaturePacks: [...POS_FEATURE_PACKS],
  },
  {
    id: 'fashion',
    label: 'Fashion / Apparel',
    description: 'Clothing, accessories, and seasonal wear.',
    icon: 'checkroom',
    estimatedProducts: 12,
    estimatedCategories: 4,
    includesFeaturePacks: [...POS_FEATURE_PACKS],
  },
  {
    id: 'electronics',
    label: 'Electronics',
    description: 'Gadgets, accessories, and consumer electronics.',
    icon: 'devices',
    estimatedProducts: 12,
    estimatedCategories: 4,
    includesFeaturePacks: [...POS_FEATURE_PACKS],
  },
  {
    id: 'beauty',
    label: 'Beauty / Salon',
    description: 'Skincare, haircare, and salon retail products.',
    icon: 'spa',
    estimatedProducts: 12,
    estimatedCategories: 4,
    includesFeaturePacks: [...POS_FEATURE_PACKS],
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy / Personal Care',
    description: 'OTC personal care and first aid only — no prescription medicines.',
    icon: 'medication',
    estimatedProducts: 12,
    estimatedCategories: 4,
    includesFeaturePacks: [...POS_FEATURE_PACKS],
  },
  {
    id: 'wholesale',
    label: 'Wholesale / Distribution',
    description: 'Bulk packs and wholesale-ready catalog starters.',
    icon: 'warehouse',
    estimatedProducts: 12,
    estimatedCategories: 4,
    includesFeaturePacks: [...POS_FEATURE_PACKS],
  },
  {
    id: 'general',
    label: 'General Business',
    description: 'A flexible starter catalog for mixed or custom businesses.',
    icon: 'business',
    estimatedProducts: 10,
    estimatedCategories: 3,
    includesFeaturePacks: [...POS_FEATURE_PACKS],
  },
];

function getBusinessType(id) {
  return BUSINESS_TYPES.find((t) => t.id === id) || null;
}

function isValidBusinessType(id) {
  return Boolean(getBusinessType(id));
}

/** Business types that automatically receive restaurant_pro entitlement */
const RESTAURANT_BUSINESS_TYPES = ['restaurant'];

/** All onboarding business types use POS and receive pos_pro entitlement */
const POS_BUSINESS_TYPES = BUSINESS_TYPES.map((t) => t.id);

function isRestaurantBusinessType(businessType) {
  return RESTAURANT_BUSINESS_TYPES.includes(businessType);
}

function isPosBusinessType(businessType) {
  return POS_BUSINESS_TYPES.includes(businessType);
}

module.exports = {
  BUSINESS_TYPES,
  POS_BUSINESS_TYPES,
  RESTAURANT_BUSINESS_TYPES,
  getBusinessType,
  isValidBusinessType,
  isRestaurantBusinessType,
  isPosBusinessType,
};
