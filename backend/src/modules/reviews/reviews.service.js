const db = require('../../config/database');
const { NotFoundError, ValidationError, UnauthorizedError } = require('../../shared/errors');

class ReviewsService {
  async productSummary(tenantId, productId) {
    const result = await db.query(
      `SELECT COUNT(*)::int AS count, COALESCE(AVG(rating), 0)::numeric(3,2) AS average
       FROM product_reviews
       WHERE tenant_id = $1 AND product_id = $2 AND status = 'approved'`,
      [tenantId, productId]
    );
    return {
      count: result.rows[0].count,
      average: Number(result.rows[0].average),
    };
  }

  async listForProduct(tenantId, productId, { page = 1, limit = 10 } = {}, storefrontCustomerId = null) {
    const lim = Math.min(50, parseInt(limit, 10) || 10);
    const offset = ((parseInt(page, 10) || 1) - 1) * lim;
    const rows = await db.query(
      `SELECT id, author_name, rating, title, body, verified_purchase, created_at
       FROM product_reviews
       WHERE tenant_id = $1 AND product_id = $2 AND status = 'approved'
       ORDER BY created_at DESC LIMIT ${lim} OFFSET ${offset}`,
      [tenantId, productId]
    );
    const summary = await this.productSummary(tenantId, productId);

    let can_review = false;
    let already_reviewed = false;
    let has_purchased = false;
    if (storefrontCustomerId) {
      const purchase = await this._hasPurchased(tenantId, productId, storefrontCustomerId);
      has_purchased = purchase;
      const existing = await db.query(
        `SELECT id FROM product_reviews
         WHERE tenant_id = $1 AND product_id = $2 AND storefront_customer_id = $3 LIMIT 1`,
        [tenantId, productId, storefrontCustomerId]
      );
      already_reviewed = Boolean(existing.rows[0]);
      can_review = has_purchased && !already_reviewed;
    }

    return {
      reviews: rows.rows,
      summary,
      can_review,
      has_purchased,
      already_reviewed,
    };
  }

  async _hasPurchased(tenantId, productId, storefrontCustomerId) {
    const purchase = await db.query(
      `SELECT 1
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id AND oi.tenant_id = o.tenant_id
       JOIN storefront_customers sc ON sc.id = $1 AND sc.tenant_id = o.tenant_id
       LEFT JOIN customers c ON c.id = o.customer_id AND c.tenant_id = o.tenant_id
       WHERE o.tenant_id = $2
         AND oi.product_id = $3
         AND o.status IN ('paid', 'completed')
         AND (
           (sc.customer_id IS NOT NULL AND o.customer_id = sc.customer_id)
           OR (c.email IS NOT NULL AND LOWER(c.email) = LOWER(sc.email))
         )
       LIMIT 1`,
      [storefrontCustomerId, tenantId, productId]
    );
    return Boolean(purchase.rows[0]);
  }

  async submit(tenantId, productId, data, storefrontCustomerId = null) {
    if (!storefrontCustomerId) {
      throw new UnauthorizedError('Please sign in to leave a review');
    }

    const product = await db.query(
      `SELECT id FROM products WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
      [productId, tenantId]
    );
    if (!product.rows[0]) throw new NotFoundError('Product not found');

    const account = await db.query(
      `SELECT id, first_name, last_name, email, customer_id FROM storefront_customers
       WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
      [storefrontCustomerId, tenantId]
    );
    const customer = account.rows[0];
    if (!customer) throw new UnauthorizedError('Please sign in to leave a review');

    const purchased = await this._hasPurchased(tenantId, productId, storefrontCustomerId);
    if (!purchased) {
      throw new ValidationError('Only customers who purchased this product can leave a review');
    }

    const rating = parseInt(data.rating, 10);
    if (!rating || rating < 1 || rating > 5) throw new ValidationError('Rating must be between 1 and 5');

    const authorName = (data.author_name || '').trim()
      || [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim()
      || customer.email;
    if (!authorName) throw new ValidationError('Your name is required');

    const existing = await db.query(
      `SELECT id FROM product_reviews
       WHERE tenant_id = $1 AND product_id = $2 AND storefront_customer_id = $3
       LIMIT 1`,
      [tenantId, productId, storefrontCustomerId]
    );
    if (existing.rows[0]) {
      throw new ValidationError('You have already reviewed this product');
    }

    const result = await db.query(
      `INSERT INTO product_reviews
         (tenant_id, product_id, storefront_customer_id, author_name, rating, title, body, status, verified_purchase)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', true) RETURNING id, status`,
      [tenantId, productId, storefrontCustomerId, authorName, rating,
        data.title || null, data.body || null]
    );
    return { ...result.rows[0], message: 'Review submitted for approval' };
  }

  // ---- Tenant moderation ----
  async listForTenant(tenantId, query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const params = [tenantId];
    let where = 'WHERE r.tenant_id = $1';
    if (query.status) { params.push(query.status); where += ` AND r.status = $${params.length}`; }

    const count = await db.query(`SELECT COUNT(*)::int AS total FROM product_reviews r ${where}`, params);
    const rows = await db.query(
      `SELECT r.*, p.name AS product_name
       FROM product_reviews r JOIN products p ON p.id = r.product_id
       ${where} ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    const total = count.rows[0].total;
    return { rows: rows.rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async moderate(tenantId, id, status) {
    if (!['approved', 'rejected', 'pending'].includes(status)) throw new ValidationError('Invalid status');
    const result = await db.query(
      `UPDATE product_reviews SET status = $3, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId, status]
    );
    if (!result.rows[0]) throw new NotFoundError('Review not found');
    return result.rows[0];
  }

  async remove(tenantId, id) {
    const result = await db.query(
      'DELETE FROM product_reviews WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Review not found');
    return { deleted: true };
  }
}

module.exports = new ReviewsService();
