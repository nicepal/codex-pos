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
    const bundle = await client.query(
      `SELECT id, name, sale_price FROM products WHERE id = $1 AND tenant_id = $2`,
      [productId, tenantId]
    );
    if (!bundle.rows[0]) throw new NotFoundError('Bundle product not found');

    const items = await client.query(
      `SELECT pbi.*, p.name, p.sale_price, p.sku
       FROM product_bundle_items pbi
       JOIN products p ON p.id = pbi.component_product_id
       WHERE pbi.tenant_id = $1 AND pbi.bundle_product_id = $2`,
      [tenantId, productId]
    );
    if (!items.rows.length) throw new ValidationError('Bundle has no components');

    const bundleUnitPrice = parseFloat(bundle.rows[0].sale_price) || 0;
    const componentRetailTotal = items.rows.reduce(
      (sum, row) => sum + (parseFloat(row.sale_price) || 0) * (row.quantity || 1),
      0
    );

    // Allocate the bundle's sale_price across components (proportional to component retail).
    // Last line absorbs rounding remainder so line totals match bundle price * qty.
    const lines = [];
    let allocatedPerBundle = 0;
    items.rows.forEach((row, idx) => {
      const compQty = row.quantity || 1;
      const retail = (parseFloat(row.sale_price) || 0) * compQty;
      let lineBundleShare;
      if (componentRetailTotal <= 0) {
        lineBundleShare = idx === items.rows.length - 1
          ? +(bundleUnitPrice - allocatedPerBundle).toFixed(4)
          : +(bundleUnitPrice / items.rows.length).toFixed(4);
      } else if (idx === items.rows.length - 1) {
        lineBundleShare = +(bundleUnitPrice - allocatedPerBundle).toFixed(4);
      } else {
        lineBundleShare = +((bundleUnitPrice * retail) / componentRetailTotal).toFixed(4);
        allocatedPerBundle += lineBundleShare;
      }
      const unitPrice = compQty > 0 ? +(lineBundleShare / compQty).toFixed(4) : 0;
      lines.push({
        product_id: row.component_product_id,
        variant_id: row.variant_id,
        product_name: row.name,
        sku: row.sku,
        quantity: compQty * quantity,
        unit_price: unitPrice,
        is_bundle_component: true,
        bundle_product_id: productId,
        bundle_name: bundle.rows[0].name,
      });
    });
    return lines;
  }
}

module.exports = new CatalogBundleService();
