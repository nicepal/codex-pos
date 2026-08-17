const BaseRepository = require('../../shared/base.repository');
const db = require('../../config/database');
const { sanitizeSort } = require('../../shared/sanitize');

const PRODUCT_SORT_COLUMNS = new Set([
  'created_at', 'updated_at', 'name', 'status', 'sale_price', 'stock_quantity', 'sku', 'barcode',
]);

class ProductRepository extends BaseRepository {
  constructor() {
    super('products');
  }

  async findAll(tenantId, options = {}) {
    const { page = 1, limit = 20, orderBy = 'created_at', order = 'DESC', filters = {} } = options;
    const { offset, limit: lim } = require('../../utils/helpers').paginate(page, limit);
    const conditions = ['p.tenant_id = $1'];
    const params = [tenantId];
    let idx = 2;

    if (filters.status) {
      conditions.push(`p.status = $${idx}`);
      params.push(filters.status);
      idx++;
    }
    if (filters.category_id) {
      conditions.push(`p.category_id = $${idx}`);
      params.push(filters.category_id);
      idx++;
    }
    if (filters.brand_id) {
      conditions.push(`p.brand_id = $${idx}`);
      params.push(filters.brand_id);
      idx++;
    }
    if (filters.q) {
      conditions.push(`(p.name ILIKE $${idx} OR p.sku ILIKE $${idx} OR p.barcode ILIKE $${idx})`);
      params.push(`%${filters.q}%`);
      idx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM products p ${where}`, params);
    const total = countResult.rows[0].total;
    const { orderBy: safeOrderBy, order: safeOrder } = sanitizeSort(orderBy, order, PRODUCT_SORT_COLUMNS);

    const result = await db.query(
      `SELECT p.*,
        (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order LIMIT 1) AS image_url
       FROM products p ${where}
       ORDER BY p.${safeOrderBy} ${safeOrder}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, lim, offset]
    );

    return {
      rows: result.rows,
      pagination: require('../../utils/helpers').paginationMeta(total, parseInt(page, 10), lim),
    };
  }

  async findWithDetails(tenantId, id) {
    const product = await this.findById(id, tenantId);
    if (!product) return null;

    const [images, variants, category, brand] = await Promise.all([
      db.query('SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order', [id]),
      db.query('SELECT * FROM product_variants WHERE product_id = $1', [id]),
      product.category_id ? db.query('SELECT * FROM categories WHERE id = $1', [product.category_id]) : { rows: [] },
      product.brand_id ? db.query('SELECT * FROM brands WHERE id = $1', [product.brand_id]) : { rows: [] },
    ]);

    return {
      ...product,
      images: images.rows,
      variants: variants.rows,
      category: category.rows[0] || null,
      brand: brand.rows[0] || null,
    };
  }

  /**
   * Prefer branch_stock aggregate so POS matches inventory after onboarding
   * (stock is written to branch_stock then synced). Falls back to products.stock_quantity
   * for legacy rows without branch_stock.
   */
  _posStockExpr(alias = 'p') {
    return `COALESCE(
      (SELECT SUM(bs.quantity)::int FROM branch_stock bs
       WHERE bs.tenant_id = ${alias}.tenant_id AND bs.product_id = ${alias}.id),
      ${alias}.stock_quantity, 0
    )`;
  }

  async search(tenantId, q, { limit = 20, category_id, branch_id } = {}) {
    const term = String(q || '').trim();
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const stockExpr = this._posStockExpr('p');

    // Empty query = browse mode for POS product grid (active catalog)
    if (!term) {
      const conditions = ['p.tenant_id = $1', "p.status = 'active'"];
      const params = [tenantId];
      let idx = 2;
      let stockSql = stockExpr;
      if (branch_id) {
        stockSql = `COALESCE(
          (SELECT SUM(bs.quantity)::int FROM branch_stock bs
           WHERE bs.tenant_id = p.tenant_id AND bs.product_id = p.id AND bs.branch_id = $${idx}),
          0
        )`;
        params.push(branch_id);
        idx++;
      }
      if (category_id) {
        conditions.push(`p.category_id = $${idx}`);
        params.push(category_id);
        idx++;
      }
      params.push(lim);
      return this.query(
        `SELECT p.id, p.name, p.sku, p.barcode, p.sale_price,
                ${stockSql} AS stock_quantity,
                p.product_type, p.category_id, p.tracks_serials, p.tracks_batches, p.is_open_price,
                (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order LIMIT 1) AS image_url
         FROM products p
         WHERE ${conditions.join(' AND ')}
         ORDER BY p.name ASC
         LIMIT $${idx}`,
        params
      );
    }

    // Exact barcode match on products or variants first (POS scan)
    const exact = await this.query(
      `SELECT p.id, p.name, p.sku, COALESCE(pv.barcode, p.barcode) AS barcode,
              COALESCE(pv.sale_price, p.sale_price) AS sale_price,
              COALESCE(pv.stock_quantity, ${stockExpr}) AS stock_quantity,
              p.product_type, p.category_id, pv.id AS variant_id, pv.name AS variant_name,
              p.tracks_serials, p.tracks_batches, p.is_open_price,
              (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order LIMIT 1) AS image_url
       FROM products p
       LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.tenant_id = p.tenant_id
         AND (pv.barcode = $2 OR p.barcode = $2)
       WHERE p.tenant_id = $1 AND p.status = 'active'
         AND (p.barcode = $2 OR pv.barcode = $2)
       LIMIT 5`,
      [tenantId, term]
    );
    if (exact.length) return exact.slice(0, lim);

    const conditions = [
      'p.tenant_id = $1',
      "p.status = 'active'",
      '(p.name ILIKE $2 OR p.sku ILIKE $2 OR p.barcode ILIKE $2 OR pv.sku ILIKE $2 OR pv.barcode ILIKE $2)',
    ];
    const params = [tenantId, `%${term}%`];
    let idx = 3;
    if (category_id) {
      conditions.push(`p.category_id = $${idx}`);
      params.push(category_id);
      idx++;
    }
    params.push(lim);
    return this.query(
      `SELECT DISTINCT ON (p.id) p.id, p.name, p.sku, p.barcode, p.sale_price,
              ${stockExpr} AS stock_quantity,
              p.product_type, p.category_id, p.tracks_serials, p.tracks_batches, p.is_open_price,
              (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order LIMIT 1) AS image_url
       FROM products p
       LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.tenant_id = p.tenant_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.id, p.name
       LIMIT $${idx}`,
      params
    );
  }
}

module.exports = new ProductRepository();
