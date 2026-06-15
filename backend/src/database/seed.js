const db = require('../config/database');
const { hashPassword } = require('../utils/password');
const logger = require('../utils/logger');

const PERMISSIONS = [
  { name: 'platform.manage', display_name: 'Manage Platform', module: 'platform' },
  { name: 'platform.businesses', display_name: 'Manage Businesses', module: 'platform' },
  { name: 'platform.plans', display_name: 'Manage Plans', module: 'platform' },
  { name: 'platform.billing', display_name: 'Manage Billing', module: 'platform' },
  { name: 'platform.support', display_name: 'Manage Support', module: 'platform' },
  { name: 'platform.cms', display_name: 'Manage CMS', module: 'platform' },
  { name: 'platform.settings', display_name: 'Platform Settings', module: 'platform' },
  { name: 'business.dashboard', display_name: 'View Dashboard', module: 'business' },
  { name: 'business.products', display_name: 'Manage Products', module: 'business' },
  { name: 'business.categories', display_name: 'Manage Categories', module: 'business' },
  { name: 'business.inventory', display_name: 'Manage Inventory', module: 'business' },
  { name: 'business.customers', display_name: 'Manage Customers', module: 'business' },
  { name: 'business.suppliers', display_name: 'Manage Suppliers', module: 'business' },
  { name: 'business.orders', display_name: 'Manage Orders', module: 'business' },
  { name: 'business.pos', display_name: 'Use POS', module: 'business' },
  { name: 'business.employees', display_name: 'Manage Employees', module: 'business' },
  { name: 'business.expenses', display_name: 'Manage Expenses', module: 'business' },
  { name: 'business.reports', display_name: 'View Reports', module: 'business' },
  { name: 'business.settings', display_name: 'Business Settings', module: 'business' },
  { name: 'business.storefront', display_name: 'Manage Storefront', module: 'business' },
];

const ROLES = [
  { name: 'super_admin', display_name: 'Super Admin', is_platform: true, permissions: PERMISSIONS.map((p) => p.name) },
  { name: 'support_agent', display_name: 'Support Agent', is_platform: true, permissions: ['platform.support', 'platform.businesses'] },
  { name: 'billing_manager', display_name: 'Billing Manager', is_platform: true, permissions: ['platform.billing', 'platform.plans'] },
  { name: 'content_manager', display_name: 'Content Manager', is_platform: true, permissions: ['platform.cms'] },
  {
    name: 'business_owner',
    display_name: 'Business Owner',
    is_platform: false,
    permissions: PERMISSIONS.filter((p) => p.module === 'business').map((p) => p.name),
  },
  {
    name: 'manager',
    display_name: 'Manager',
    is_platform: false,
    permissions: [
      'business.dashboard', 'business.products', 'business.categories', 'business.inventory',
      'business.customers', 'business.orders', 'business.pos', 'business.reports', 'business.expenses',
    ],
  },
  {
    name: 'cashier',
    display_name: 'Cashier',
    is_platform: false,
    permissions: ['business.dashboard', 'business.pos', 'business.orders', 'business.customers'],
  },
];

const PLANS = [
  {
    name: 'Starter', slug: 'starter', monthly_price: 29, annual_price: 290, trial_days: 14,
    product_limit: 100, user_limit: 2, branch_limit: 1, storage_limit_mb: 512, transaction_limit: 500,
    features: { pos: true, inventory: true, reports: false, storefront: false },
  },
  {
    name: 'Professional', slug: 'professional', monthly_price: 79, annual_price: 790, trial_days: 14,
    product_limit: 1000, user_limit: 10, branch_limit: 3, storage_limit_mb: 5120, transaction_limit: 5000,
    features: { pos: true, inventory: true, reports: true, storefront: true, multi_branch: true },
  },
  {
    name: 'Enterprise', slug: 'enterprise', monthly_price: 199, annual_price: 1990, trial_days: 30,
    product_limit: -1, user_limit: -1, branch_limit: -1, storage_limit_mb: 51200, transaction_limit: -1,
    features: { pos: true, inventory: true, reports: true, storefront: true, api_access: true, multi_branch: true, loyalty: true, whatsapp: true, analytics: true },
  },
];

async function seed() {
  logger.info('Starting database seed...');

  for (const perm of PERMISSIONS) {
    await db.query(
      `INSERT INTO permissions (name, display_name, module)
       VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
      [perm.name, perm.display_name, perm.module]
    );
  }

  const permMap = {};
  const permRows = await db.query('SELECT id, name FROM permissions');
  permRows.rows.forEach((r) => { permMap[r.name] = r.id; });

  for (const role of ROLES) {
    const roleResult = await db.query(
      `INSERT INTO roles (name, display_name, is_platform_role)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING id`,
      [role.name, role.display_name, role.is_platform]
    );
    const roleId = roleResult.rows[0].id;

    for (const permName of role.permissions) {
      if (permMap[permName]) {
        await db.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleId, permMap[permName]]
        );
      }
    }
  }

  for (const plan of PLANS) {
    await db.query(
      `INSERT INTO plans (name, slug, monthly_price, annual_price, trial_days, product_limit, user_limit, branch_limit, storage_limit_mb, transaction_limit, features)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (slug) DO NOTHING`,
      [plan.name, plan.slug, plan.monthly_price, plan.annual_price, plan.trial_days,
        plan.product_limit, plan.user_limit, plan.branch_limit, plan.storage_limit_mb,
        plan.transaction_limit, JSON.stringify(plan.features)]
    );
  }

  const adminHash = await hashPassword('Admin@123456');
  const adminResult = await db.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, email_verified_at, status)
     VALUES ('admin@eyz.com', $1, 'Super', 'Admin', NOW(), 'active')
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [adminHash]
  );

  if (adminResult.rows[0]) {
    const superAdminRole = await db.query(`SELECT id FROM roles WHERE name = 'super_admin'`);
    await db.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [adminResult.rows[0].id, superAdminRole.rows[0].id]
    );
  }

  const demoTenant = await db.query(
    `INSERT INTO tenants (name, slug, email, phone, address, timezone, currency, status, trial_ends_at)
     VALUES ('Demo Store', 'demo', 'owner@demo.eyz.com', '+1234567890', '123 Main St', 'America/New_York', 'USD', 'active', NOW() + INTERVAL '14 days')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
  );

  const tenantId = demoTenant.rows[0].id;

  await db.query(
    `INSERT INTO tenant_domains (tenant_id, domain, domain_type, is_primary, verification_status)
     VALUES ($1, 'demo.eyz.com', 'subdomain', true, 'verified')
     ON CONFLICT (domain) DO NOTHING`,
    [tenantId]
  );

  const proPlan = await db.query(`SELECT id FROM plans WHERE slug = 'professional'`);
  await db.query(
    `INSERT INTO subscriptions (tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end, trial_ends_at)
     VALUES ($1, $2, 'trialing', 'monthly', NOW(), NOW() + INTERVAL '1 month', NOW() + INTERVAL '14 days')
     ON CONFLICT DO NOTHING`,
    [tenantId, proPlan.rows[0].id]
  );

  const ownerHash = await hashPassword('Owner@123456');
  const ownerResult = await db.query(
    `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, email_verified_at, status)
     VALUES ($1, 'owner@demo.eyz.com', $2, 'John', 'Doe', NOW(), 'active')
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [tenantId, ownerHash]
  );

  if (ownerResult.rows[0]) {
    const ownerRole = await db.query(`SELECT id FROM roles WHERE name = 'business_owner'`);
    await db.query(
      `INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [ownerResult.rows[0].id, ownerRole.rows[0].id, tenantId]
    );
  }

  const templates = [
    { slug: 'welcome', name: 'Welcome Email', subject: 'Welcome to {{business_name}}!', body: '<p>Hello {{owner_name}}, welcome to EYZ POS!</p>' },
    { slug: 'password_reset', name: 'Password Reset', subject: 'Reset Your Password', body: '<p>Click the link to reset your password.</p>' },
    { slug: 'invoice', name: 'Invoice Email', subject: 'Invoice {{invoice_number}}', body: '<p>Your invoice {{invoice_number}} is ready.</p>' },
    { slug: 'trial_expiry', name: 'Trial Expiry', subject: 'Your trial is ending soon', body: '<p>Hi {{owner_name}}, your trial for {{business_name}} ends soon.</p>' },
    { slug: 'subscription_renewal', name: 'Subscription Renewal', subject: 'Subscription Renewed', body: '<p>Your subscription has been renewed.</p>' },
  ];

  for (const t of templates) {
    await db.query(
      `INSERT INTO email_templates (slug, name, subject, body_html, variables)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
      [t.slug, t.name, t.subject, t.body, JSON.stringify(['business_name', 'owner_name', 'invoice_number'])]
    );
  }

  logger.info('Database seed completed');
  logger.info('Super Admin: admin@eyz.com / Admin@123456');
  logger.info('Business Owner: owner@demo.eyz.com / Owner@123456');
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Seed failed', { error: err.message });
      process.exit(1);
    });
}

module.exports = { seed };
