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
      // Link to / create a CRM customer record so storefront orders tie into CRM
      let customerId = null;
      const crm = await client.query(
        `INSERT INTO customers (tenant_id, name, email, phone)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [tenantId, `${data.first_name || ''} ${data.last_name || ''}`.trim() || email, email, data.phone || null]
      );
      customerId = crm.rows[0].id;

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
    const result = await db.query(
      'SELECT * FROM storefront_customers WHERE tenant_id = $1 AND email = $2',
      [tenantId, (email || '').trim().toLowerCase()]
    );
    const account = result.rows[0];
    if (!account || account.status !== 'active') throw new UnauthorizedError('Invalid credentials');
    const valid = await comparePassword(password, account.password_hash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');
    return { customer: sanitize(account), token: issueToken(account) };
  }

  async getById(tenantId, id) {
    const result = await db.query(
      'SELECT * FROM storefront_customers WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Account not found');
    return sanitize(result.rows[0]);
  }

  async orders(tenantId, id) {
    const result = await db.query(
      `SELECT o.id, o.order_number, o.total_amount, o.status, o.fulfillment_status, o.created_at
       FROM orders o
       JOIN storefront_customers sc ON sc.customer_id = o.customer_id
       WHERE sc.id = $1 AND o.tenant_id = $2
       ORDER BY o.created_at DESC LIMIT 100`,
      [id, tenantId]
    );
    return result.rows;
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
