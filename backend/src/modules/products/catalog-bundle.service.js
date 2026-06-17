const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');

class CatalogBundleService {
  async getBundleItems(tenantId, bundleProductId) {
    const result = await db.query(
      `SELECT pbi.*, p.name AS component_name, p.sale_price
       FROM product_bundle_items pbi
       JOIN products p ON p.id = pbi.component_product_id
       WHERE pbi.tenant_id = $1 AND pbi.bundle_product_id = $2`,
      [tenantId, bundleProductId]
    );
    return result.rows;
  }

  async setBundleItems(tenantId, bundleProductId, items) {
    const product = await db.query(
      'SELECT id, product_type FROM products WHERE id = $1 AND tenant_id = $2',
      [bundleProductId, tenantId]
    );
    if (!product.rows[0]) throw new NotFoundError('Bundle product not found');

    await db.query('DELETE FROM product_bundle_items WHERE tenant_id = $1 AND bundle_product_id = $2', [tenantId, bundleProductId]);
    for (const item of items || []) {
      await db.query(
        `INSERT INTO product_bundle_items (tenant_id, bundle_product_id, component_product_id, variant_id, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, bundleProductId, item.component_product_id, item.variant_id || null, item.quantity || 1]
      );
    }
    await db.query(
      `UPDATE products SET product_type = 'bundle' WHERE id = $1 AND tenant_id = $2`,
      [bundleProductId, tenantId]
    );
    return this.getBundleItems(tenantId, bundleProductId);
  }

  async expandBundleForOrder(client, tenantId, productId, quantity) {
    const items = await client.query(
      `SELECT pbi.*, p.name, p.sale_price, p.sku
       FROM product_bundle_items pbi
       JOIN products p ON p.id = pbi.component_product_id
       WHERE pbi.tenant_id = $1 AND pbi.bundle_product_id = $2`,
      [tenantId, productId]
    );
    if (!items.rows.length) throw new ValidationError('Bundle has no components');
    return items.rows.map((row) => ({
      product_id: row.component_product_id,
      variant_id: row.variant_id,
      product_name: row.name,
      sku: row.sku,
      quantity: (row.quantity || 1) * quantity,
      unit_price: parseFloat(row.sale_price),
      is_bundle_component: true,
      bundle_product_id: productId,
    }));
  }
}

module.exports = new CatalogBundleService();
