const db = require('../../config/database');
const fs = require('fs');
const {
  toStorefrontMediaUrl,
  extractMediaRelativePath,
  resolveMediaFilePath,
} = require('../../services/upload.service');

/** Customer-facing copy that should never appear on the public storefront. */
const INTERNAL_COPY_RE = /onboarding|codex\s*pos|starter product|inventory synced|synced with our pos/i;

function sanitizeCustomerText(value) {
  if (value == null) return null;
  const text = String(value).replace(/<[^>]+>/g, '').trim();
  if (!text) return null;
  if (INTERNAL_COPY_RE.test(text)) return null;
  return text;
}

/**
 * Onboarding used tiny solid-color PNGs (~450B) as fake product photos.
 * Treat those as "no image" so the storefront shows a neutral placeholder.
 */
function isSolidColorPlaceholder(storedUrl) {
  const relativePath = extractMediaRelativePath(storedUrl);
  if (!relativePath) return false;
  const fullPath = resolveMediaFilePath(relativePath);
  if (!fullPath || !fs.existsSync(fullPath)) return false;
  try {
    const { size } = fs.statSync(fullPath);
    return size > 0 && size < 2048;
  } catch {
    return false;
  }
}

function resolveProductImageUrl(storedUrl) {
  if (!storedUrl) return null;
  if (isSolidColorPlaceholder(storedUrl)) return null;
  return toStorefrontMediaUrl(storedUrl);
}

function mapProductRow(row) {
  if (!row) return row;
  return {
    ...row,
    description: sanitizeCustomerText(row.description),
    image_url: resolveProductImageUrl(row.image_url),
  };
}

function mapProductDetail(row) {
  if (!row) return row;
  const images = Array.isArray(row.images)
    ? row.images
      .filter((img) => img?.url && !isSolidColorPlaceholder(img.url))
      .map((img) => ({
        ...img,
        url: toStorefrontMediaUrl(img.url),
      }))
    : [];
  return {
    ...row,
    description: sanitizeCustomerText(row.description),
    image_url: images[0]?.url || null,
    images,
  };
}

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
      logo_url: toStorefrontMediaUrl(tenant.logo_url),
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
      conditions.push(
        `(p.name ILIKE $${idx} OR COALESCE(p.description, '') ILIKE $${idx} OR COALESCE(p.sku, '') ILIKE $${idx})`,
      );
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
      `SELECT p.id, p.name, p.slug, p.sale_price, p.compare_at_price, p.description, p.stock_quantity,
              c.name AS category_name, c.slug AS category_slug,
              (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) AS image_url,
              EXISTS (
                SELECT 1 FROM product_variants pv
                WHERE pv.product_id = p.id AND pv.status = 'active'
              ) AS has_variants
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${where}
       ORDER BY p.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return {
      products: result.rows.map(mapProductRow),
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
    return mapProductDetail(result.rows[0] || null);
  }

  async getCategories(tenantId) {
    const result = await db.query(
      `SELECT id, name, slug, image_url FROM categories
       WHERE tenant_id = $1 AND status = 'active' ORDER BY sort_order, name`,
      [tenantId]
    );
    return result.rows.map((row) => ({
      ...row,
      image_url: toStorefrontMediaUrl(row.image_url),
    }));
  }

  async getPickupBranches(tenantId) {
    const result = await db.query(
      `SELECT id, name, address, phone FROM branches
       WHERE tenant_id = $1 AND status = 'active' ORDER BY name`,
      [tenantId]
    );
    return result.rows;
  }

  async getRelatedProducts(tenantId, productId, categoryId, limit = 4) {
    const result = await db.query(
      `SELECT p.id, p.name, p.slug, p.sale_price, p.compare_at_price, p.stock_quantity, p.description,
              c.name AS category_name, c.slug AS category_slug,
              (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) AS image_url,
              EXISTS (
                SELECT 1 FROM product_variants pv
                WHERE pv.product_id = p.id AND pv.status = 'active'
              ) AS has_variants
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.tenant_id = $1 AND p.status = 'active' AND p.id != $2
         AND ($3::uuid IS NULL OR p.category_id = $3)
       ORDER BY RANDOM() LIMIT $4`,
      [tenantId, productId, categoryId, limit]
    );
    return result.rows.map(mapProductRow);
  }
}

module.exports = new StorefrontService();
