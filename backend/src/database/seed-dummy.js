const db = require('../config/database');
const { hashPassword } = require('../utils/password');
const logger = require('../utils/logger');
const { generateOrderNumber, generateInvoiceNumber, generateTicketNumber } = require('../utils/helpers');

const CATEGORY_NAMES = [
  'Electronics', 'Clothing', 'Food & Beverage', 'Home & Garden', 'Sports',
  'Beauty & Personal Care', 'Books & Stationery', 'Toys & Games', 'Automotive', 'Health & Wellness',
];

const BRAND_NAMES = ['Nova', 'PrimeLine', 'UrbanCraft', 'FreshPeak', 'CoreValue'];
const FIRST_NAMES = ['James', 'Sarah', 'Michael', 'Emily', 'David', 'Lisa', 'Robert', 'Anna', 'Chris', 'Maria'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Taylor'];
const BUSINESS_TYPES = ['Mart', 'Shop', 'Store', 'Outlet', 'Emporium', 'Trading', 'Retail', 'Market', 'Bazaar', 'Hub'];
const BUSINESS_PREFIXES = ['Alpha', 'Beta', 'City', 'Metro', 'Golden', 'Silver', 'Royal', 'Prime', 'Swift', 'Bright', 'Nova', 'Elite', 'Urban', 'Green', 'Blue', 'Red', 'Sun', 'Moon', 'Star', 'Peak'];

const PRODUCT_ADJECTIVES = ['Premium', 'Classic', 'Pro', 'Lite', 'Ultra', 'Essential', 'Deluxe', 'Smart', 'Eco', 'Daily'];
const PRODUCT_NOUNS = ['Widget', 'Gadget', 'Kit', 'Pack', 'Set', 'Tool', 'Accessory', 'Bundle', 'Item', 'Supply'];

function slugify(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function money(min, max) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

async function getRoleId(name) {
  const r = await db.query('SELECT id FROM roles WHERE name = $1', [name]);
  return r.rows[0]?.id;
}

async function seedCategories(tenantId, prefix = '') {
  const ids = [];
  for (let i = 0; i < CATEGORY_NAMES.length; i++) {
    const name = CATEGORY_NAMES[i];
    const slug = slugify(`${prefix}${name}`);
    const result = await db.query(
      `INSERT INTO categories (tenant_id, name, slug, description, sort_order, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       ON CONFLICT (tenant_id, slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [tenantId, name, slug, `${name} products and accessories`, i]
    );
    ids.push(result.rows[0].id);
  }
  return ids;
}

async function seedBrands(tenantId, prefix = '') {
  const ids = [];
  for (const name of BRAND_NAMES) {
    const slug = slugify(`${prefix}${name}`);
    const result = await db.query(
      `INSERT INTO brands (tenant_id, name, slug, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (tenant_id, slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [tenantId, name, slug]
    );
    ids.push(result.rows[0].id);
  }
  return ids;
}

async function seedProducts(tenantId, categoryIds, brandIds, count, slugPrefix = '') {
  const productIds = [];
  for (let i = 1; i <= count; i++) {
    const name = `${pick(PRODUCT_ADJECTIVES)} ${pick(PRODUCT_NOUNS)} ${i}`;
    const slug = slugify(`${slugPrefix}product-${i}`);
    const sku = `${slugPrefix.toUpperCase().replace(/-/g, '') || 'PRD'}${String(i).padStart(4, '0')}`;
    const cost = parseFloat(money(5, 80));
    const sale = parseFloat((cost * (1.2 + Math.random() * 0.8)).toFixed(2));
    const stock = randBetween(5, 200);

    const result = await db.query(
      `INSERT INTO products (tenant_id, category_id, brand_id, name, slug, sku, barcode, cost_price, sale_price, stock_quantity, low_stock_threshold, description, status, meta_title, meta_description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13, $14)
       ON CONFLICT (tenant_id, slug) DO UPDATE SET stock_quantity = EXCLUDED.stock_quantity
       RETURNING id`,
      [
        tenantId,
        pick(categoryIds),
        pick(brandIds),
        name,
        slug,
        sku,
        `BAR${sku}`,
        cost,
        sale,
        stock,
        randBetween(5, 15),
        `High quality ${name.toLowerCase()} for everyday use.`,
        `${name} | Buy Online`,
        `Shop ${name} at great prices.`,
      ]
    );
    productIds.push({ id: result.rows[0].id, name, sku, sale_price: sale, stock });
  }
  return productIds;
}

async function seedCustomers(tenantId, count = 10) {
  const ids = [];
  for (let i = 0; i < count; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const result = await db.query(
      `INSERT INTO customers (tenant_id, name, email, phone, address, city, loyalty_points, credit_balance, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active') RETURNING id`,
      [
        tenantId,
        `${first} ${last}`,
        `${first.toLowerCase()}.${last.toLowerCase()}${i}@customer.local`,
        `+1555${String(randBetween(1000000, 9999999))}`,
        `${randBetween(100, 9999)} Main Street`,
        pick(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix']),
        randBetween(0, 500),
        parseFloat(money(0, 100)),
      ]
    );
    ids.push(result.rows[0].id);
  }
  return ids;
}

async function seedEmployees(tenantId, ownerUserId) {
  const ids = [];
  const roles = ['manager', 'cashier', 'cashier'];
  for (let i = 0; i < roles.length; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const result = await db.query(
      `INSERT INTO employees (tenant_id, name, email, phone, role, status, hired_at)
       VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_DATE - ($6 || ' days')::interval) RETURNING id`,
      [
        tenantId,
        `${first} ${last}`,
        `emp${i}.${tenantId.slice(0, 8)}@staff.local`,
        `+1555${String(randBetween(1000000, 9999999))}`,
        roles[i],
        randBetween(30, 365),
      ]
    );
    ids.push(result.rows[0].id);
  }
  return ids;
}

async function seedSuppliers(tenantId) {
  const ids = [];
  for (let i = 1; i <= 2; i++) {
    const result = await db.query(
      `INSERT INTO suppliers (tenant_id, name, email, phone, address, contact_person, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active') RETURNING id`,
      [
        tenantId,
        `Supplier ${i} Co.`,
        `supplier${i}.${tenantId.slice(0, 8)}@supply.local`,
        `+1555${String(randBetween(1000000, 9999999))}`,
        `${randBetween(100, 999)} Industrial Blvd`,
        pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES),
      ]
    );
    ids.push(result.rows[0].id);
  }
  return ids;
}

async function seedBranches(tenantId) {
  const main = await db.query(
    `INSERT INTO branches (tenant_id, name, code, address, phone, is_primary, status)
     VALUES ($1, 'Main Branch', 'MAIN', $2, $3, true, 'active')
     ON CONFLICT (tenant_id, code) DO NOTHING RETURNING id`,
    [tenantId, `${randBetween(100, 999)} Commerce Ave`, `+1555${randBetween(1000000, 9999999)}`]
  );
  const ids = main.rows[0] ? [main.rows[0].id] : [];
  if (Math.random() > 0.5) {
    const branch2 = await db.query(
      `INSERT INTO branches (tenant_id, name, code, address, phone, is_primary, status)
       VALUES ($1, 'Downtown Branch', 'DT01', $2, $3, false, 'active') RETURNING id`,
      [tenantId, `${randBetween(100, 999)} Downtown Rd`, `+1555${randBetween(1000000, 9999999)}`]
    );
    if (branch2.rows[0]) ids.push(branch2.rows[0].id);
  }
  return ids;
}

async function seedOrders(tenantId, products, customerIds, employeeIds, userId, count = 15) {
  const statuses = ['paid', 'completed', 'paid', 'completed', 'pending', 'cancelled'];
  const methods = ['cash', 'card', 'bank', 'cash', 'card'];

  for (let o = 0; o < count; o++) {
    const orderNumber = generateOrderNumber();
    const numItems = randBetween(1, 4);
    const orderProducts = [];
    let subtotal = 0;

    for (let j = 0; j < numItems; j++) {
      const p = pick(products);
      const qty = randBetween(1, 3);
      const unitPrice = parseFloat(p.sale_price);
      subtotal += unitPrice * qty;
      orderProducts.push({ ...p, quantity: qty, unit_price: unitPrice });
    }

    const tax = parseFloat((subtotal * 0.08).toFixed(2));
    const discount = Math.random() > 0.7 ? parseFloat((subtotal * 0.05).toFixed(2)) : 0;
    const total = subtotal + tax - discount;
    const status = pick(statuses);
    const method = pick(methods);

    const orderResult = await db.query(
      `INSERT INTO orders (tenant_id, order_number, customer_id, employee_id, order_type, status, subtotal, tax_amount, discount_amount, total_amount, payment_method, payment_status, created_by, completed_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW() - ($15 || ' days')::interval)
       RETURNING id`,
      [
        tenantId,
        orderNumber,
        pick(customerIds),
        pick(employeeIds),
        Math.random() > 0.8 ? 'online' : 'pos',
        status,
        subtotal,
        tax,
        discount,
        total,
        method,
        ['paid', 'completed'].includes(status) ? 'paid' : 'pending',
        userId,
        ['paid', 'completed'].includes(status) ? new Date() : null,
        randBetween(0, 60),
      ]
    );
    const orderId = orderResult.rows[0].id;

    for (const item of orderProducts) {
      const lineTotal = item.unit_price * item.quantity;
      await db.query(
        `INSERT INTO order_items (tenant_id, order_id, product_id, product_name, sku, quantity, unit_price, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [tenantId, orderId, item.id, item.name, item.sku, item.quantity, item.unit_price, lineTotal]
      );
    }

    if (['paid', 'completed'].includes(status)) {
      await db.query(
        `INSERT INTO order_payments (tenant_id, order_id, payment_method, amount) VALUES ($1, $2, $3, $4)`,
        [tenantId, orderId, method, total]
      );
    }
  }
}

async function seedExpenses(tenantId, userId, count = 5) {
  const categories = ['Rent', 'Utilities', 'Salaries', 'Marketing', 'Supplies', 'Maintenance'];
  for (let i = 0; i < count; i++) {
    await db.query(
      `INSERT INTO expenses (tenant_id, title, amount, category, expense_date, notes, created_by)
       VALUES ($1, $2, $3, $4, CURRENT_DATE - ($5 || ' days')::interval, $6, $7)`,
      [
        tenantId,
        `${pick(categories)} expense`,
        money(50, 2000),
        pick(categories),
        randBetween(1, 90),
        'Auto-generated expense record',
        userId,
      ]
    );
  }
}

async function seedInventoryTransactions(tenantId, products, userId) {
  for (const p of products.slice(0, Math.min(10, products.length))) {
    await db.query(
      `INSERT INTO inventory_transactions (tenant_id, product_id, transaction_type, quantity, previous_quantity, new_quantity, notes, created_by)
       VALUES ($1, $2, 'stock_in', $3, $4, $5, 'Initial stock', $6)`,
      [tenantId, p.id, randBetween(10, 50), p.stock, p.stock + randBetween(10, 50), userId]
    );
  }
}

async function seedPurchaseOrder(tenantId, supplierId, products, userId) {
  const poNumber = `PO-${Date.now().toString(36).toUpperCase()}-${tenantId.slice(0, 4)}`;
  let total = 0;
  const po = await db.query(
    `INSERT INTO purchase_orders (tenant_id, supplier_id, po_number, status, total_amount, ordered_at, created_by)
     VALUES ($1, $2, $3, 'ordered', 0, NOW(), $4) RETURNING id`,
    [tenantId, supplierId, poNumber, userId]
  );
  const poId = po.rows[0].id;

  for (const p of products.slice(0, 3)) {
    const qty = randBetween(10, 30);
    const cost = parseFloat(money(5, 40));
    const lineTotal = qty * cost;
    total += lineTotal;
    await db.query(
      `INSERT INTO purchase_order_items (tenant_id, purchase_order_id, product_id, quantity, unit_cost, total_cost)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tenantId, poId, p.id, qty, cost, lineTotal]
    );
  }

  await db.query('UPDATE purchase_orders SET total_amount = $1 WHERE id = $2', [total, poId]);
}

async function seedSettings(tenantId) {
  const settings = {
    tax_rate: parseFloat(money(5, 12)),
    receipt_footer: 'Thank you for shopping with us!',
    low_stock_alert: true,
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.query(
      `INSERT INTO settings (tenant_id, key, value) VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value`,
      [tenantId, key, JSON.stringify(value)]
    );
  }
  await db.query(
    `INSERT INTO settings (tenant_id, key, value) VALUES ($1, 'storefront_primary_color', $2)
     ON CONFLICT (tenant_id, key) DO NOTHING`,
    [tenantId, JSON.stringify('#2563eb')]
  );
}

async function seedTicket(tenantId, userId) {
  await db.query(
    `INSERT INTO tickets (tenant_id, user_id, ticket_number, subject, category, priority, status, description)
     VALUES ($1, $2, $3, $4, 'general', 'medium', 'open', $5)`,
    [tenantId, userId, generateTicketNumber(), 'Need help with inventory setup', 'Please assist with bulk import settings.']
  );
}

async function seedTenantBusiness(data) {
  const {
    name, slug, email, planId, ownerRoleId, productCount = 20,
  } = data;

  const existing = await db.query('SELECT id FROM tenants WHERE slug = $1', [slug]);
  if (existing.rows[0]) {
    logger.info(`Skipping existing tenant: ${slug}`);
    return { id: existing.rows[0].id, created: false };
  }

  const passwordHash = await hashPassword('Owner@123456');
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const tenantResult = await client.query(
      `INSERT INTO tenants (name, slug, email, phone, address, city, state, country, timezone, currency, status, trial_ends_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'US', 'America/New_York', 'USD', $8, NOW() + INTERVAL '14 days')
       RETURNING id`,
      [
        name, slug, email,
        `+1${randBetween(2000000000, 9999999999)}`,
        `${randBetween(100, 9999)} Business Park`,
        pick(['New York', 'Los Angeles', 'Chicago', 'Dallas', 'Seattle']),
        pick(['NY', 'CA', 'IL', 'TX', 'WA']),
        pick(['active', 'trial', 'active', 'active']),
      ]
    );
    const tenantId = tenantResult.rows[0].id;

    await client.query(
      `INSERT INTO tenant_domains (tenant_id, domain, domain_type, is_primary, verification_status)
       VALUES ($1, $2, 'subdomain', true, 'verified')`,
      [tenantId, `${slug}.eyz.com`]
    );

    await client.query(
      `INSERT INTO subscriptions (tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end, trial_ends_at)
       VALUES ($1, $2, $3, 'monthly', NOW(), NOW() + INTERVAL '1 month', NOW() + INTERVAL '14 days')`,
      [tenantId, planId, Math.random() > 0.3 ? 'active' : 'trialing']
    );

    const userResult = await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, email_verified_at, status)
       VALUES ($1, $2, $3, $4, $5, NOW(), 'active') RETURNING id`,
      [tenantId, email, passwordHash, pick(FIRST_NAMES), pick(LAST_NAMES)]
    );
    const userId = userResult.rows[0].id;

    await client.query(
      `INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES ($1, $2, $3)`,
      [userId, ownerRoleId, tenantId]
    );

    await client.query('COMMIT');

    const prefix = `${slug}-`;
    const categoryIds = await seedCategories(tenantId, prefix);
    const brandIds = await seedBrands(tenantId, prefix);
    const products = await seedProducts(tenantId, categoryIds, brandIds, productCount, prefix);
    const customerIds = await seedCustomers(tenantId, 10);
    const employeeIds = await seedEmployees(tenantId, userId);
    const supplierIds = await seedSuppliers(tenantId);

    await seedBranches(tenantId);
    await seedOrders(tenantId, products, customerIds, employeeIds, userId, 15);
    await seedExpenses(tenantId, userId, 5);
    await seedInventoryTransactions(tenantId, products, userId);
    await seedPurchaseOrder(tenantId, supplierIds[0], products, userId);
    await seedSettings(tenantId);
    await seedTicket(tenantId, userId);

    // Invoice for subscription
    const total = parseFloat(money(29, 199));
    await db.query(
      `INSERT INTO invoices (tenant_id, plan_id, invoice_number, amount, tax, discount, total, status, paid_at)
       VALUES ($1, $2, $3, $4, 0, 0, $4, 'paid', NOW())`,
      [tenantId, planId, generateInvoiceNumber(), total]
    );

    return { id: tenantId, created: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function seedDemoStoreProducts(tenantId, productCount = 100) {
  const existing = await db.query('SELECT COUNT(*)::int AS c FROM products WHERE tenant_id = $1', [tenantId]);
  const hasEnoughProducts = existing.rows[0].c >= productCount;

  if (!hasEnoughProducts) {
    logger.info(`Seeding demo store with 10 categories and ${productCount} products...`);
  } else {
    logger.info(`Demo store already has ${existing.rows[0].c} products, ensuring module data...`);
  }

  const categoryIds = await seedCategories(tenantId, 'demo-');
  const brandIds = await seedBrands(tenantId, 'demo-');

  if (!hasEnoughProducts) {
    const toCreate = productCount - existing.rows[0].c;
    await seedProducts(tenantId, categoryIds, brandIds, toCreate, 'demo-');
  }

  const productRows = await db.query(
    'SELECT id, name, sku, sale_price, stock_quantity AS stock FROM products WHERE tenant_id = $1',
    [tenantId]
  );
  const products = productRows.rows.map((r) => ({
    ...r,
    sale_price: parseFloat(r.sale_price),
  }));

  const owner = await db.query(
    `SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id WHERE u.tenant_id = $1 AND r.name = 'business_owner' LIMIT 1`,
    [tenantId]
  );
  const userId = owner.rows[0]?.id;
  if (!userId || !products.length) return;

  const customerCount = await db.query('SELECT COUNT(*)::int AS c FROM customers WHERE tenant_id = $1', [tenantId]);
  let customerIds;
  if (customerCount.rows[0].c < 10) {
    customerIds = await seedCustomers(tenantId, 15);
  } else {
    const rows = await db.query('SELECT id FROM customers WHERE tenant_id = $1', [tenantId]);
    customerIds = rows.rows.map((r) => r.id);
  }

  const employeeResult = await db.query('SELECT id FROM employees WHERE tenant_id = $1 LIMIT 3', [tenantId]);
  let employeeIds = employeeResult.rows.map((r) => r.id);
  if (!employeeIds.length) employeeIds = await seedEmployees(tenantId, userId);

  const supplierCheck = await db.query('SELECT COUNT(*)::int AS c FROM suppliers WHERE tenant_id = $1', [tenantId]);
  let supplierIds;
  if (supplierCheck.rows[0].c < 1) {
    supplierIds = await seedSuppliers(tenantId);
  } else {
    const rows = await db.query('SELECT id FROM suppliers WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    supplierIds = rows.rows.map((r) => r.id);
  }

  const orderCount = await db.query('SELECT COUNT(*)::int AS c FROM orders WHERE tenant_id = $1', [tenantId]);
  if (orderCount.rows[0].c < 10) {
    await seedOrders(tenantId, products, customerIds, employeeIds, userId, 25);
  }

  const expenseCount = await db.query('SELECT COUNT(*)::int AS c FROM expenses WHERE tenant_id = $1', [tenantId]);
  if (expenseCount.rows[0].c < 5) await seedExpenses(tenantId, userId, 8);

  const invCount = await db.query('SELECT COUNT(*)::int AS c FROM inventory_transactions WHERE tenant_id = $1', [tenantId]);
  if (invCount.rows[0].c < 5) await seedInventoryTransactions(tenantId, products, userId);

  const branchCount = await db.query('SELECT COUNT(*)::int AS c FROM branches WHERE tenant_id = $1', [tenantId]);
  if (branchCount.rows[0].c < 1) await seedBranches(tenantId);

  await seedSettings(tenantId);

  const poCount = await db.query('SELECT COUNT(*)::int AS c FROM purchase_orders WHERE tenant_id = $1', [tenantId]);
  if (poCount.rows[0].c < 1 && supplierIds?.length) {
    await seedPurchaseOrder(tenantId, supplierIds[0], products, userId);
  }

  const ticketCount = await db.query('SELECT COUNT(*)::int AS c FROM tickets WHERE tenant_id = $1', [tenantId]);
  if (ticketCount.rows[0].c < 1) await seedTicket(tenantId, userId);

  logger.info('Demo store module data ready');
}

async function seedDummyData() {
  logger.info('Starting dummy data seed...');

  const ownerRoleId = await getRoleId('business_owner');
  const plans = await db.query('SELECT id, slug FROM plans');
  const planIds = plans.rows;

  if (!ownerRoleId || !planIds.length) {
    throw new Error('Run npm run seed first to create roles and plans');
  }

  // Demo store: 100 products + 10 categories
  const demo = await db.query(`SELECT id FROM tenants WHERE slug = 'demo'`);
  if (demo.rows[0]) {
    await seedDemoStoreProducts(demo.rows[0].id, 100);
  }

  // 50 dummy businesses with full module data
  logger.info('Creating 50 dummy businesses...');
  let created = 0;

  for (let i = 1; i <= 50; i++) {
    const num = String(i).padStart(2, '0');
    const prefix = pick(BUSINESS_PREFIXES);
    const type = pick(BUSINESS_TYPES);
    const name = `${prefix} ${type} ${num}`;
    const slug = `business-${num}`;
    const email = `owner${num}@seed.eyz.com`;
    const plan = pick(planIds);

    try {
      const result = await seedTenantBusiness({
        name,
        slug,
        email,
        planId: plan.id,
        ownerRoleId,
        productCount: 20,
      });
      if (result?.created) created++;
      if (i % 10 === 0) logger.info(`Progress: ${i}/50 businesses`);
    } catch (err) {
      logger.error(`Failed to seed business ${slug}`, { error: err.message });
    }
  }

  const stats = await db.query(`
    SELECT
      (SELECT COUNT(*)::int FROM tenants WHERE status != 'deleted') AS businesses,
      (SELECT COUNT(*)::int FROM products) AS products,
      (SELECT COUNT(*)::int FROM categories) AS categories,
      (SELECT COUNT(*)::int FROM customers) AS customers,
      (SELECT COUNT(*)::int FROM orders) AS orders,
      (SELECT COUNT(*)::int FROM employees) AS employees,
      (SELECT COUNT(*)::int FROM suppliers) AS suppliers,
      (SELECT COUNT(*)::int FROM expenses) AS expenses
  `);

  logger.info('Dummy data seed completed!');
  logger.info('Summary:', stats.rows[0]);
  logger.info(`Created ${created} new businesses`);
  logger.info('All business owners password: Owner@123456');
  logger.info('Example logins: owner01@seed.eyz.com ... owner50@seed.eyz.com');
}

if (require.main === module) {
  seedDummyData()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Dummy seed failed', { error: err.message, stack: err.stack });
      process.exit(1);
    });
}

module.exports = { seedDummyData };
