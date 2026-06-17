const db = require('../../config/database');
const { TenantError } = require('../../shared/errors');

class StorefrontService {
  async getStoreInfo(tenant) {
    const settings = await db.query(
      `SELECT key, value FROM settings WHERE tenant_id = $1`,
      [tenant.id]
    );
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logo_url: tenant.logo_url,
      email: tenant.email,
      phone: tenant.phone,
      address: tenant.address,
      currency: tenant.currency,
      settings: Object.fromEntries(settings.rows.map((s) => [s.key, s.value])),
    };
  }

  async getProducts(tenantId, { page = 1, limit = 20, category, search }) {
    const offset = (page - 1) * limit;
    const conditions = ["p.tenant_id = $1", "p.status = 'active'"];
    const params = [tenantId];
    let idx = 2;

    if (category) {
      conditions.push(`c.slug = $${idx++}`);
      params.push(category);
    }
    if (search) {
      conditions.push(`(p.name ILIKE $${idx} OR p.description ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.join(' AND ');
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM products p
       LEFT JOIN categories c ON c.id = p.category_id WHERE ${where}`,
      params
    );

    const result = await db.query(
      `SELECT p.id, p.name, p.slug, p.sale_price, p.description, p.stock_quantity,
              c.name AS category_name, c.slug AS category_slug,
              (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) AS image_url
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${where}
       ORDER BY p.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return {
      products: result.rows,
      pagination: {
        total: countResult.rows[0].total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(countResult.rows[0].total / limit),
      },
    };
  }

  async getProduct(tenantId, slug) {
    const result = await db.query(
      `SELECT p.*, c.name AS category_name,
              (SELECT json_agg(img ORDER BY sort_order) FROM product_images img WHERE img.product_id = p.id) AS images,
              (SELECT json_agg(v) FROM product_variants v WHERE v.product_id = p.id AND v.status = 'active') AS variants
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.tenant_id = $1 AND p.slug = $2 AND p.status = 'active'`,
      [tenantId, slug]
    );
    return result.rows[0] || null;
  }

  async getCategories(tenantId) {
    const result = await db.query(
      `SELECT id, name, slug, image_url FROM categories
       WHERE tenant_id = $1 AND status = 'active' ORDER BY sort_order, name`,
      [tenantId]
    );
    return result.rows;
  }

  async getPickupBranches(tenantId) {
    const result = await db.query(
      `SELECT id, name, address, city, phone FROM branches
       WHERE tenant_id = $1 AND status = 'active' ORDER BY name`,
      [tenantId]
    );
    return result.rows;
  }

  async getRelatedProducts(tenantId, productId, categoryId, limit = 4) {
    const result = await db.query(
      `SELECT p.id, p.name, p.slug, p.sale_price,
              (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) AS image_url
       FROM products p
       WHERE p.tenant_id = $1 AND p.status = 'active' AND p.id != $2
         AND ($3::uuid IS NULL OR p.category_id = $3)
       ORDER BY RANDOM() LIMIT $4`,
      [tenantId, productId, categoryId, limit]
    );
    return result.rows;
  }
}

module.exports = new StorefrontService();
