/**
 * Marketing feature copy grounded in shipped PosHive modules.
 * Partial / gated capabilities are labeled. No invented claims.
 */
export const featureHighlights = [
  {
    id: 'pos',
    title: 'Point of sale that keeps the line moving',
    body: 'Cash, card, and split payments with tips and gift cards. Offline queue via PWA + IndexedDB with client_order_id idempotency.',
    href: '/features/pos',
    points: ['POS Pro: variants, returns, quick keys', 'Cash drawer sessions', 'Offline order sync'],
    layout: 'wide',
  },
  {
    id: 'inventory',
    title: 'Inventory tied to every sale',
    body: 'Products with variants, brands, and categories. Transfers, stock take, and purchase orders when Inventory Pro is enabled.',
    href: '/features/inventory',
    points: ['Branch stock visibility', 'Low-stock awareness', 'Supplier & PO workflows'],
    layout: 'split',
  },
  {
    id: 'ecommerce',
    title: 'Storefront on your subdomain',
    body: 'Public shop on {slug}.poshive.store or a verified custom domain. Cart, checkout, accounts, wishlists, and reviews.',
    href: '/features/ecommerce',
    points: ['Professional+ storefront', 'Custom domains (Omnichannel)', 'Coupons & reviews'],
    layout: 'split',
  },
];

export const featurePages = {
  overview: {
    title: 'Everything on one platform',
    description:
      'PosHive combines POS, inventory, multi-tenant storefronts, reports, and developer tooling — with plan limits and feature packs.',
    groups: [
      {
        title: 'Sell',
        items: [
          'In-store POS checkout',
          'Tips & gift cards',
          'Orders (POS + online)',
          'Tenant coupons',
        ],
      },
      {
        title: 'Stock',
        items: [
          'Products, variants, images',
          'Inventory movements',
          'Transfers & stock take (Inventory Pro)',
          'Purchase orders',
        ],
      },
      {
        title: 'Grow',
        items: [
          'Reports & dashboards (Recharts)',
          'AI reorder insights (assistive)',
          'Shopify product import',
          'API keys, webhooks, public API',
        ],
      },
    ],
  },
  pos: {
    title: 'Point of Sale',
    description: 'Cashier-ready POS with offline resilience — not a toy demo register.',
    sections: [
      {
        heading: 'Checkout that survives bad Wi‑Fi',
        body: 'Orders can queue offline via PWA + IndexedDB and sync with client_order_id idempotency so you do not double-charge.',
      },
      {
        heading: 'Payments & extras',
        body: 'Tips, gift cards, and payment intents are part of the sales flow. Cash drawer support helps end-of-day reconciliation.',
      },
      {
        heading: 'POS Pro pack',
        body: 'When enabled: variants at POS, returns, quick keys, and manager overrides. Starter starts with core POS; packs unlock depth.',
      },
    ],
  },
  inventory: {
    title: 'Inventory',
    description: 'Catalog and stock operations for multi-tenant retail — with Pro packs for transfers and receiving.',
    sections: [
      {
        heading: 'Catalog foundation',
        body: 'Products with variants, images, categories, brands, compare-at price, and Shopify-related vendor/tags fields.',
      },
      {
        heading: 'Inventory Pro',
        body: 'Transfers between branches, stock take, and purchase-order receiving — gated by inventory_pro on Professional+ defaults.',
      },
      {
        heading: 'Operations around stock',
        body: 'Suppliers, expenses, tax rules, and branch limits follow your plan (Starter: 1; Professional: 3; Enterprise: unlimited).',
      },
    ],
  },
  ecommerce: {
    title: 'eCommerce storefront',
    description: 'Each tenant gets a public storefront — subdomain by default, custom domain with Omnichannel.',
    sections: [
      {
        heading: 'Shop experience',
        body: 'Home, product, cart, checkout, and order confirmation. Customer accounts, addresses, wishlists, and product reviews.',
      },
      {
        heading: 'Plan note',
        body: 'Seeded Professional and Enterprise plans include storefront. Starter focuses on in-store POS and inventory without storefront by default.',
      },
      {
        heading: 'Marketplace honesty',
        body: 'Marketplace channel modules exist as stubs for expansion — not a full Amazon/eBay marketplace network today.',
      },
    ],
  },
  analytics: {
    title: 'Analytics & AI insights',
    description: 'Reports for operators; AI assists with reorder-style insights — labeled as examples, not magic forecasting.',
    sections: [
      {
        heading: 'Reports you can act on',
        body: 'Business dashboards and reports cover sales, inventory health, and customer signals. Charts in PosHive use Recharts.',
      },
      {
        heading: 'AI Pro (assistive)',
        body: 'AI insights focus on reorder suggestions and copilot-style help. Enterprise defaults enable ai_pro; treat outputs as decision support.',
      },
      {
        heading: 'What AI is not',
        body: 'PosHive does not claim autonomous buying, guaranteed forecasts, or set-and-forget inventory. Humans stay in control.',
      },
    ],
  },
};

/** Three onboarding steps + starter catalog callout */
export const howItWorks = [
  {
    step: 1,
    title: 'Create your business',
    body: 'Register, pick a plan, and start a trial. Onboarding walks you through business type and basics.',
  },
  {
    step: 2,
    title: 'Load a starter catalog',
    body: 'Choose a business type and seed a starter catalog (categories + sample products) so the floor is not empty on day one.',
  },
  {
    step: 3,
    title: 'Invite the team & sell',
    body: 'Add managers and cashiers with RBAC. Run POS in-store; enable storefront on Professional+.',
  },
];

export const trustItems = [
  { label: 'Multi-tenant isolation', detail: 'tenant_id on every scoped table' },
  { label: 'RBAC permissions', detail: 'Platform + business roles' },
  { label: 'JWT + refresh tokens', detail: 'Short-lived access tokens' },
  { label: 'Audit logging', detail: 'Mutations tracked' },
  { label: 'BullMQ workers', detail: 'Email, Shopify, notifications' },
  { label: 'Stripe subscriptions', detail: 'Or stub provider for labs' },
];

/** Business types from backend onboarding (business-types.js) */
export const businessTypes = [
  { id: 'retail', label: 'Retail Store', description: 'General merchandise and everyday retail.' },
  { id: 'restaurant', label: 'Restaurant / Cafe', description: 'Menu items for QSR and casual dining.' },
  { id: 'grocery', label: 'Grocery / Convenience', description: 'Pantry staples and everyday essentials.' },
  { id: 'fashion', label: 'Fashion / Apparel', description: 'Clothing, accessories, seasonal wear.' },
  { id: 'electronics', label: 'Electronics', description: 'Gadgets and consumer electronics.' },
  { id: 'beauty', label: 'Beauty / Salon', description: 'Skincare, haircare, salon retail.' },
  { id: 'pharmacy', label: 'Pharmacy / Personal Care', description: 'OTC personal care — no Rx medicines.' },
  { id: 'wholesale', label: 'Wholesale / Distribution', description: 'Bulk packs and wholesale starters.' },
  { id: 'general', label: 'General Business', description: 'Flexible catalog for mixed businesses.' },
];
