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

  async search(tenantId, q, { limit = 20, category_id } = {}) {
    const conditions = [
      'tenant_id = $1',
      "status = 'active'",
      '(name ILIKE $2 OR sku ILIKE $2 OR barcode ILIKE $2)',
    ];
    const params = [tenantId, `%${q}%`];
    let idx = 3;
    if (category_id) {
      conditions.push(`category_id = $${idx}`);
      params.push(category_id);
      idx++;
    }
    params.push(limit);
    return this.query(
      `SELECT id, name, sku, barcode, sale_price, stock_quantity, product_type, category_id,
        (SELECT url FROM product_images WHERE product_id = products.id ORDER BY is_primary DESC, sort_order LIMIT 1) AS image_url
       FROM products
       WHERE ${conditions.join(' AND ')}
       ORDER BY name LIMIT $${idx}`,
      params
    );
  }
}

module.exports = new ProductRepository();
