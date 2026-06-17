const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');

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

  async listForProduct(tenantId, productId, { page = 1, limit = 10 } = {}) {
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
    return { reviews: rows.rows, summary };
  }

  async submit(tenantId, productId, data, storefrontCustomerId = null) {
    const product = await db.query(
      `SELECT id FROM products WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
      [productId, tenantId]
    );
    if (!product.rows[0]) throw new NotFoundError('Product not found');

    const rating = parseInt(data.rating, 10);
    if (!rating || rating < 1 || rating > 5) throw new ValidationError('Rating must be between 1 and 5');
    if (!data.author_name?.trim()) throw new ValidationError('Your name is required');

    // Mark as verified purchase if this customer has a paid order for the product
    let verified = false;
    if (storefrontCustomerId) {
      const purchase = await db.query(
        `SELECT 1 FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN storefront_customers sc ON sc.customer_id = o.customer_id
         WHERE sc.id = $1 AND oi.product_id = $2 AND o.status IN ('paid','completed') LIMIT 1`,
        [storefrontCustomerId, productId]
      );
      verified = Boolean(purchase.rows[0]);
    }

    const result = await db.query(
      `INSERT INTO product_reviews
         (tenant_id, product_id, storefront_customer_id, author_name, rating, title, body, status, verified_purchase)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8) RETURNING id, status`,
      [tenantId, productId, storefrontCustomerId, data.author_name.trim(), rating,
        data.title || null, data.body || null, verified]
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
