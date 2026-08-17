/**
 * Prices & limits from backend/src/database/seed.js
 * Feature packs from docs/FEATURE_PACKS.md + shared/features.js PLAN_DEFAULTS
 */
export const billingToggle = {
  monthly: 'Monthly',
  yearly: 'Yearly',
  yearlyNote: 'Pay annually and save ~2 months vs monthly.',
};

export const plans = [
  {
    id: 'starter',
    name: 'Starter',
    monthly: 29,
    yearly: 290,
    trialDays: 14,
    blurb: 'Core POS and inventory for a single location.',
    highlighted: false,
    limits: {
      products: '100 products',
      users: '2 users',
      branches: '1 branch',
      storage: '512 MB storage',
      transactions: '500 transactions / period',
    },
    includes: [
      'POS checkout',
      'Inventory basics',
      'Products & categories',
      'Customers',
      'Team invites (within limit)',
    ],
    excludes: [
      'Storefront (not on Starter defaults)',
      'Feature packs off by default',
      'Reports pack flag off in seed features',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    monthly: 79,
    yearly: 790,
    trialDays: 14,
    blurb: 'Multi-branch retail with storefront and Pro packs.',
    highlighted: true,
    limits: {
      products: '1,000 products',
      users: '10 users',
      branches: '3 branches',
      storage: '5 GB storage',
      transactions: '5,000 transactions / period',
    },
    includes: [
      'Everything in Starter',
      'Storefront + multi-branch',
      'Reports',
      'POS Pro, Catalog Pro, Inventory Pro',
      'Advanced Tax, CRM Pro, Omnichannel',
      'Marketing Pro',
    ],
    excludes: [
      'Staff Pro, Finance Pro, AI Pro (Enterprise defaults)',
      'Manufacturing & Enterprise SSO packs',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthly: 199,
    yearly: 1990,
    trialDays: 30,
    blurb: 'Unlimited scale with all feature packs enabled.',
    highlighted: false,
    limits: {
      products: 'Unlimited products',
      users: 'Unlimited users',
      branches: 'Unlimited branches',
      storage: '50 GB storage',
      transactions: 'Unlimited transactions',
    },
    includes: [
      'Everything in Professional',
      'All feature packs on',
      'API access & advanced analytics flags',
      'AI Pro, Finance Pro, Manufacturing Pro',
      'SSO / SCIM / franchise (Enterprise pack)',
      '30-day trial',
    ],
    excludes: [],
  },
];

export const comparisonRows = [
  { label: 'Monthly price', starter: '$29', professional: '$79', enterprise: '$199' },
  { label: 'Yearly price', starter: '$290', professional: '$790', enterprise: '$1,990' },
  { label: 'Trial', starter: '14 days', professional: '14 days', enterprise: '30 days' },
  { label: 'Products', starter: '100', professional: '1,000', enterprise: 'Unlimited' },
  { label: 'Users', starter: '2', professional: '10', enterprise: 'Unlimited' },
  { label: 'Branches', starter: '1', professional: '3', enterprise: 'Unlimited' },
  { label: 'POS & inventory', starter: true, professional: true, enterprise: true },
  { label: 'Storefront', starter: false, professional: true, enterprise: true },
  { label: 'POS Pro', starter: false, professional: true, enterprise: true },
  { label: 'Catalog Pro', starter: false, professional: true, enterprise: true },
  { label: 'Inventory Pro', starter: false, professional: true, enterprise: true },
  { label: 'Advanced Tax', starter: false, professional: true, enterprise: true },
  { label: 'CRM Pro', starter: false, professional: true, enterprise: true },
  { label: 'Omnichannel', starter: false, professional: true, enterprise: true },
  { label: 'Marketing Pro', starter: false, professional: true, enterprise: true },
  { label: 'Staff Pro', starter: false, professional: false, enterprise: true },
  { label: 'Finance Pro', starter: false, professional: false, enterprise: true },
  { label: 'AI Pro', starter: false, professional: false, enterprise: true },
  { label: 'Manufacturing Pro', starter: false, professional: false, enterprise: true },
  { label: 'Enterprise (SSO/SCIM)', starter: false, professional: false, enterprise: true },
  { label: 'Developer API access', starter: '—', professional: '—', enterprise: 'Yes (seed flag)' },
];
