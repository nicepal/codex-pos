const db = require('../../config/database');
const { hashPassword, comparePassword } = require('../../utils/password');
const { generateAccessToken, verifyAccessToken } = require('../../utils/jwt');
const { ConflictError, UnauthorizedError, NotFoundError, ValidationError } = require('../../shared/errors');

function issueToken(account) {
  return generateAccessToken({
    sub: account.id,
    tenantId: account.tenant_id,
    scope: 'storefront',
  });
}

function sanitize(account) {
  const { password_hash, ...rest } = account;
  return rest;
}

class StorefrontCustomersService {
  async register(tenantId, data) {
    const email = (data.email || '').trim().toLowerCase();
    if (!email) throw new ValidationError('Email is required');
    if (!data.password || data.password.length < 6) throw new ValidationError('Password must be at least 6 characters');

    const existing = await db.query(
      'SELECT id FROM storefront_customers WHERE tenant_id = $1 AND email = $2',
      [tenantId, email]
    );
    if (existing.rows[0]) throw new ConflictError('An account with this email already exists');

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      // Reuse existing CRM customer by email (so prior guest orders appear in account)
      let customerId = null;
      const existingCrm = await client.query(
        `SELECT id FROM customers WHERE tenant_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1`,
        [tenantId, email]
      );
      if (existingCrm.rows[0]) {
        customerId = existingCrm.rows[0].id;
        await client.query(
          `UPDATE customers SET
             name = COALESCE(NULLIF($3, ''), name),
             phone = COALESCE(NULLIF($4, ''), phone),
             updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2`,
          [customerId, tenantId, `${data.first_name || ''} ${data.last_name || ''}`.trim(), data.phone || null]
        );
      } else {
        const crm = await client.query(
          `INSERT INTO customers (tenant_id, name, email, phone)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [tenantId, `${data.first_name || ''} ${data.last_name || ''}`.trim() || email, email, data.phone || null]
        );
        customerId = crm.rows[0].id;
      }

      const passwordHash = await hashPassword(data.password);
      const account = await client.query(
        `INSERT INTO storefront_customers (tenant_id, customer_id, email, password_hash, first_name, last_name, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [tenantId, customerId, email, passwordHash, data.first_name || null, data.last_name || null, data.phone || null]
      );
      await client.query('COMMIT');
      const acct = account.rows[0];
      return { customer: sanitize(acct), token: issueToken(acct) };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async login(tenantId, email, password) {
    const normalized = (email || '').trim().toLowerCase();
    const result = await db.query(
      'SELECT * FROM storefront_customers WHERE tenant_id = $1 AND email = $2',
      [tenantId, normalized]
    );
    const account = result.rows[0];
    if (!account || account.status !== 'active') throw new UnauthorizedError('Invalid credentials');
    const valid = await comparePassword(password, account.password_hash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    // Heal link if guest checkout created a different CRM row for the same email
    await this._syncCustomerLink(tenantId, account);

    const refreshed = await db.query(
      'SELECT * FROM storefront_customers WHERE id = $1 AND tenant_id = $2',
      [account.id, tenantId]
    );
    return { customer: sanitize(refreshed.rows[0] || account), token: issueToken(refreshed.rows[0] || account) };
  }

  async _syncCustomerLink(tenantId, account) {
    if (!account?.email) return account;
    const email = String(account.email).trim().toLowerCase();

    // Prefer the CRM customer that already has the most orders for this email
    const crm = await db.query(
      `SELECT c.id, COUNT(o.id)::int AS order_count
       FROM customers c
       LEFT JOIN orders o ON o.customer_id = c.id AND o.tenant_id = c.tenant_id
       WHERE c.tenant_id = $1 AND LOWER(TRIM(c.email)) = $2
       GROUP BY c.id
       ORDER BY COUNT(o.id) DESC, c.created_at ASC
       LIMIT 1`,
      [tenantId, email]
    );
    const crmId = crm.rows[0]?.id;
    if (!crmId) return account;

    if (crmId !== account.customer_id) {
      await db.query(
        `UPDATE storefront_customers SET customer_id = $1, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3`,
        [crmId, account.id, tenantId]
      );
      account.customer_id = crmId;
    }

    // Point sibling CRM rows' orders at the linked customer so history is complete
    await db.query(
      `UPDATE orders SET customer_id = $1
       WHERE tenant_id = $2
         AND customer_id IN (
           SELECT id FROM customers
           WHERE tenant_id = $2 AND LOWER(TRIM(email)) = $3 AND id <> $1
         )`,
      [crmId, tenantId, email]
    );

    return account;
  }

  async getById(tenantId, id) {
    const result = await db.query(
      'SELECT * FROM storefront_customers WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Account not found');
    await this._syncCustomerLink(tenantId, result.rows[0]);
    const refreshed = await db.query(
      'SELECT * FROM storefront_customers WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    return sanitize(refreshed.rows[0]);
  }

  async orders(tenantId, id) {
    const account = await db.query(
      'SELECT id, customer_id, email FROM storefront_customers WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    let sc = account.rows[0];
    if (!sc) throw new NotFoundError('Account not found');
    await this._syncCustomerLink(tenantId, sc);
    const refreshed = await db.query(
      'SELECT id, customer_id, email FROM storefront_customers WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    sc = refreshed.rows[0] || sc;

    const email = sc.email ? String(sc.email).trim().toLowerCase() : null;

    const result = await db.query(
      `SELECT DISTINCT o.id, o.order_number, o.total_amount, o.status, o.fulfillment_status,
              o.payment_method, o.created_at
       FROM orders o
       LEFT JOIN customers c ON c.id = o.customer_id AND c.tenant_id = o.tenant_id
       WHERE o.tenant_id = $1
         AND (
           ($2::uuid IS NOT NULL AND o.customer_id = $2)
           OR ($3::text IS NOT NULL AND c.email IS NOT NULL AND LOWER(TRIM(c.email)) = $3)
           OR ($3::text IS NOT NULL AND o.customer_id IN (
                SELECT id FROM customers
                WHERE tenant_id = $1 AND email IS NOT NULL AND LOWER(TRIM(email)) = $3
              ))
       OR ($3::text IS NOT NULL AND o.notes ILIKE '%' || $3 || '%')
         )
       ORDER BY o.created_at DESC
       LIMIT 100`,
      [tenantId, sc.customer_id || null, email]
    );

    const orders = result.rows;
    if (!orders.length) return [];

    const orderIds = orders.map((o) => o.id);
    const items = await db.query(
      `SELECT oi.order_id, oi.product_id, oi.product_name, oi.quantity, oi.unit_price, oi.total,
              p.slug AS product_slug,
              EXISTS (
                SELECT 1 FROM product_reviews pr
                WHERE pr.tenant_id = oi.tenant_id
                  AND pr.product_id = oi.product_id
                  AND pr.storefront_customer_id = $2
              ) AS already_reviewed
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id AND p.tenant_id = oi.tenant_id
       WHERE oi.tenant_id = $1 AND oi.order_id = ANY($3::uuid[])
       ORDER BY oi.id`,
      [tenantId, id, orderIds]
    );

    const byOrder = {};
    for (const row of items.rows) {
      if (!byOrder[row.order_id]) byOrder[row.order_id] = [];
      const canReview = ['paid', 'completed'].includes(
        orders.find((o) => o.id === row.order_id)?.status
      ) && row.product_id && row.product_slug && !row.already_reviewed;

      byOrder[row.order_id].push({
        product_id: row.product_id,
        product_name: row.product_name,
        product_slug: row.product_slug,
        quantity: row.quantity,
        unit_price: row.unit_price,
        total: row.total,
        already_reviewed: row.already_reviewed,
        can_review: Boolean(canReview),
      });
    }

    return orders.map((o) => ({
      ...o,
      items: byOrder[o.id] || [],
    }));
  }

  // ---- Addresses ----
  async listAddresses(tenantId, id) {
    const result = await db.query(
      'SELECT * FROM storefront_addresses WHERE tenant_id = $1 AND storefront_customer_id = $2 ORDER BY is_default DESC, created_at',
      [tenantId, id]
    );
    return result.rows;
  }

  async addAddress(tenantId, id, data) {
    if (data.is_default) {
      await db.query(
        'UPDATE storefront_addresses SET is_default = false WHERE storefront_customer_id = $1',
        [id]
      );
    }
    const result = await db.query(
      `INSERT INTO storefront_addresses
         (tenant_id, storefront_customer_id, label, line1, line2, city, state, postal_code, country, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [tenantId, id, data.label || null, data.line1 || null, data.line2 || null, data.city || null,
        data.state || null, data.postal_code || null, data.country || null, data.is_default || false]
    );
    return result.rows[0];
  }

  // ---- Wishlist ----
  async wishlist(tenantId, id) {
    const result = await db.query(
      `SELECT w.id, w.product_id, p.name, p.sale_price, p.image_url, p.slug, p.stock_quantity
       FROM storefront_wishlists w JOIN products p ON p.id = w.product_id
       WHERE w.tenant_id = $1 AND w.storefront_customer_id = $2 AND p.status = 'active'
       ORDER BY w.created_at DESC`,
      [tenantId, id]
    );
    return result.rows;
  }

  async toggleWishlist(tenantId, id, productId) {
    const existing = await db.query(
      'SELECT id FROM storefront_wishlists WHERE storefront_customer_id = $1 AND product_id = $2',
      [id, productId]
    );
    if (existing.rows[0]) {
      await db.query('DELETE FROM storefront_wishlists WHERE id = $1', [existing.rows[0].id]);
      return { in_wishlist: false };
    }
    await db.query(
      'INSERT INTO storefront_wishlists (tenant_id, storefront_customer_id, product_id) VALUES ($1, $2, $3)',
      [tenantId, id, productId]
    );
    return { in_wishlist: true };
  }
}

const service = new StorefrontCustomersService();

/**
 * Express middleware that authenticates a storefront customer via their JWT.
 * Requires the tenant to already be resolved (storefront router does this).
 */
async function authenticateStorefrontCustomer(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedError('Login required');
    const decoded = verifyAccessToken(auth.split(' ')[1]);
    if (decoded.scope !== 'storefront') throw new UnauthorizedError('Invalid session');
    if (req.tenant && decoded.tenantId && decoded.tenantId !== req.tenant.id) {
      throw new UnauthorizedError('Session does not match this store');
    }
    req.storefrontCustomerId = decoded.sub;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Invalid or expired session'));
    }
    next(err);
  }
}

module.exports = { service, authenticateStorefrontCustomer };
