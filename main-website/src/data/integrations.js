/** Only advertise integrations that exist in the product today. */
export const integrations = [
  {
    id: 'shopify',
    name: 'Shopify',
    body: 'GraphQL bulk product import with BullMQ workers, mapping tables, and in-app progress.',
    href: '/integrations/shopify',
    status: 'available',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    body: 'Subscription checkout sessions and webhooks for plan billing (stub provider available for labs).',
    href: '/pricing',
    status: 'available',
  },
  {
    id: 'email',
    name: 'Email',
    body: 'Queued transactional email via Nodemailer, DB-managed SMTP, templates, and delivery logs.',
    href: '/contact',
    status: 'available',
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    body: 'Tenant webhook endpoints for event-driven automation (Omnichannel-related workflows).',
    href: '/features',
    status: 'available',
  },
  {
    id: 'api',
    name: 'Developer API',
    body: 'API keys, usage metering, and public API routes for custom integrations.',
    href: '/#developers',
    status: 'available',
  },
];

export const shopifyPage = {
  title: 'Shopify product import',
  description:
    'Bring your Shopify catalog into CodexPOS with bulk GraphQL operations, background jobs, and mapping — without pretending we are a full Shopify clone.',
  steps: [
    'Connect your Shopify store from Business → Integrations → Shopify.',
    'Start a bulk import; progress streams via workers (and realtime where enabled).',
    'Review mapping and continue selling in CodexPOS POS / inventory.',
  ],
  notes: [
    'Focused on product import workflows, not full order bi-sync.',
    'Requires Redis/BullMQ workers for reliable job processing.',
    'Marketplace stubs elsewhere are separate and incomplete — do not confuse them with Shopify import.',
  ],
};
