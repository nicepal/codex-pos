export const blogPosts = [
  {
    slug: 'unify-pos-and-inventory',
    title: 'Why unify POS and inventory on one tenant',
    excerpt: 'Shared catalog and stock visibility reduce reconciliation debt between the counter and the stockroom.',
    date: '2026-06-12',
    readMinutes: 5,
    tags: ['POS', 'Inventory'],
    body: [
      'When checkout and stock live in separate tools, every return and transfer becomes a manual patch. CodexPOS keeps POS orders and inventory movements in the same tenant database with strict tenant_id isolation.',
      'Cashiers sell against real stock signals. Managers see low-stock and branch health without exporting CSVs overnight.',
      'Start with Starter for a single branch, then unlock Inventory Pro transfers as you grow into Professional.',
    ],
  },
  {
    slug: 'multi-branch-stock-transfers',
    title: 'Multi-branch transfers without spreadsheet chaos',
    excerpt: 'Professional plans support multiple branches; Inventory Pro adds transfers and stock take.',
    date: '2026-06-28',
    readMinutes: 6,
    tags: ['Inventory', 'Branches'],
    body: [
      'Growing from one store to three usually breaks ad-hoc stock sheets first. CodexPOS models branches as first-class entities with plan limits (1 / 3 / unlimited).',
      'With Inventory Pro enabled, transfers and stock take give you an auditable path between locations.',
      'Enterprise removes branch ceilings when franchise-style footprints need room to expand.',
    ],
  },
  {
    slug: 'shopify-import-without-chaos',
    title: 'Import Shopify products without losing a weekend',
    excerpt: 'Use CodexPOS’s GraphQL bulk import and worker pipeline instead of hand-copying SKUs.',
    date: '2026-07-10',
    readMinutes: 4,
    tags: ['Shopify', 'Integrations'],
    body: [
      'Catalog migrations fail when they depend on heroic CSV editing. CodexPOS’s Shopify integration runs bulk GraphQL ops through BullMQ with mapping tables and progress UI.',
      'Treat it as an import pipeline — not a promise of full bi-directional commerce sync on day one.',
      'After import, sell through CodexPOS POS and optional storefront while keeping Shopify as an upstream catalog source.',
    ],
  },
  {
    slug: 'ai-reorder-insights',
    title: 'AI reorder insights: assistive, not autonomous',
    excerpt: 'How CodexPOS frames AI suggestions so operators stay in control.',
    date: '2026-07-22',
    readMinutes: 5,
    tags: ['AI', 'Analytics'],
    body: [
      'AI Pro unlocks forecasting-style assistance and content helpers — but CodexPOS labels insights as examples and decision support.',
      'Reorder suggestions should highlight candidates, not silently raise POs. Humans approve purchasing.',
      'If a vendor promises magic inventory autopilot, ask what happens when seasonality shifts. We prefer honest assistive tooling.',
    ],
  },
  {
    slug: 'developer-api-webhooks',
    title: 'Extend CodexPOS with API keys and webhooks',
    excerpt: 'Metered API access and webhooks let you connect internal tools without forking the core.',
    date: '2026-08-01',
    readMinutes: 5,
    tags: ['Developers', 'API'],
    body: [
      'The Developers area issues API keys with usage metering. Public API routes authenticate via those keys.',
      'Webhooks help push events into your own automation — especially useful with Omnichannel workflows.',
      'Build against /api/v1 patterns already used by the business app; keep secrets out of the browser.',
    ],
  },
];

export function getPost(slug) {
  return blogPosts.find((p) => p.slug === slug);
}

export function getRelatedPosts(slug, limit = 2) {
  return blogPosts.filter((p) => p.slug !== slug).slice(0, limit);
}
