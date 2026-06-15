const productRepo = require('./products.repository');
const db = require('../../config/database');
const { NotFoundError } = require('../../shared/errors');
const { slugify } = require('../../utils/helpers');
const { checkLimit } = require('../../shared/plan-limits');

class ProductService {
  async list(tenantId, query) {
    return productRepo.findAll(tenantId, {
      page: query.page,
      limit: query.limit,
      filters: {
        status: query.status,
        category_id: query.category_id,
        brand_id: query.brand_id,
        q: query.q || query.search,
      },
    });
  }

  async getById(tenantId, id) {
    const product = await productRepo.findWithDetails(tenantId, id);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  async create(tenantId, data) {
    await checkLimit(tenantId, 'products');
    const slug = data.slug || slugify(data.name);
    const product = await productRepo.create({
      ...data,
      slug,
      stock_quantity: data.stock_quantity || 0,
    }, tenantId);

    if (data.variants?.length) {
      for (const v of data.variants) {
        await db.query(
          `INSERT INTO product_variants (tenant_id, product_id, name, sku, attributes, cost_price, sale_price, stock_quantity)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [tenantId, product.id, v.name, v.sku, JSON.stringify(v.attributes || {}), v.cost_price || 0, v.sale_price, v.stock_quantity || 0]
        );
      }
    }

    return this.getById(tenantId, product.id);
  }

  async update(tenantId, id, data) {
    const { variants, images, ...productData } = data;
    if (productData.name && !productData.slug) {
      productData.slug = slugify(productData.name);
    }
    await productRepo.update(id, productData, tenantId);

    if (variants?.length) {
      for (const v of variants) {
        if (v.id) {
          await db.query(
            `UPDATE product_variants SET name=$1, sku=$2, attributes=$3, cost_price=$4, sale_price=$5, stock_quantity=$6
             WHERE id=$7 AND tenant_id=$8 AND product_id=$9`,
            [v.name, v.sku, JSON.stringify(v.attributes || {}), v.cost_price || 0, v.sale_price, v.stock_quantity || 0, v.id, tenantId, id]
          );
        } else {
          await db.query(
            `INSERT INTO product_variants (tenant_id, product_id, name, sku, attributes, cost_price, sale_price, stock_quantity)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [tenantId, id, v.name, v.sku, JSON.stringify(v.attributes || {}), v.cost_price || 0, v.sale_price, v.stock_quantity || 0]
          );
        }
      }
    }

    return this.getById(tenantId, id);
  }

  async remove(tenantId, id) {
    return productRepo.delete(id, tenantId);
  }

  async bulkRemove(tenantId, ids) {
    const { bulkRemoveByIds } = require('../../shared/bulk-delete');
    return bulkRemoveByIds((tid, itemId) => this.remove(tid, itemId), tenantId, ids);
  }

  async search(tenantId, q, options = {}) {
    return productRepo.search(tenantId, q, options);
  }

  async addImage(tenantId, productId, imageData) {
    const product = await productRepo.findById(productId, tenantId);
    if (!product) throw new NotFoundError('Product not found');

    const isPrimary = imageData.is_primary ?? false;
    if (isPrimary) {
      await db.query(
        'UPDATE product_images SET is_primary = false WHERE product_id = $1 AND tenant_id = $2',
        [productId, tenantId]
      );
    }

    const result = await db.query(
      `INSERT INTO product_images (tenant_id, product_id, url, alt_text, sort_order, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenantId, productId, imageData.url, imageData.alt_text || product.name, imageData.sort_order || 0, isPrimary]
    );

    return result.rows[0];
  }

  async removeImage(tenantId, productId, imageId) {
    await db.query(
      'DELETE FROM product_images WHERE id = $1 AND product_id = $2 AND tenant_id = $3',
      [imageId, productId, tenantId]
    );
    return true;
  }

  async deleteVariant(tenantId, productId, variantId) {
    const result = await db.query(
      'DELETE FROM product_variants WHERE id = $1 AND product_id = $2 AND tenant_id = $3 RETURNING id',
      [variantId, productId, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Variant not found');
    return true;
  }
}

module.exports = new ProductService();
