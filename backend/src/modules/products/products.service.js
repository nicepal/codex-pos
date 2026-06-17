const productRepo = require('./products.repository');
const db = require('../../config/database');
const { NotFoundError } = require('../../shared/errors');
const { slugify } = require('../../utils/helpers');
const { checkLimit } = require('../../shared/plan-limits');
const { pickAllowedFields } = require('../../shared/sanitize');

const PRODUCT_WRITABLE_FIELDS = [
  'category_id', 'brand_id', 'branch_id', 'name', 'slug', 'sku', 'barcode', 'product_type',
  'cost_price', 'sale_price', 'stock_quantity', 'low_stock_threshold',
  'description', 'status', 'meta_title', 'meta_description',
  'is_open_price', 'tax_rule_id', 'tracks_serials', 'tracks_batches',
];

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
    const { variants, images, ...rest } = data;
    const productData = pickAllowedFields(rest, PRODUCT_WRITABLE_FIELDS);
    const slug = productData.slug || slugify(productData.name);
    const product = await productRepo.create({
      ...productData,
      slug,
      stock_quantity: productData.stock_quantity || 0,
    }, tenantId);

    if (variants?.length) {
      await productRepo.update(product.id, { product_type: 'variable' }, tenantId);
      for (const v of variants) {
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
    const { variants, images, ...rest } = data;
    const productData = pickAllowedFields(rest, PRODUCT_WRITABLE_FIELDS);
    if (productData.name && !productData.slug) {
      productData.slug = slugify(productData.name);
    }
    await productRepo.update(id, productData, tenantId);

    if (variants?.length) {
      await productRepo.update(id, { product_type: 'variable' }, tenantId);
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

  async _uniqueSlug(tenantId, baseSlug) {
    let slug = baseSlug;
    let counter = 0;
    while (true) {
      const result = await db.query(
        'SELECT id FROM products WHERE tenant_id = $1 AND slug = $2 LIMIT 1',
        [tenantId, slug]
      );
      if (!result.rows[0]) return slug;
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }
  }

  async duplicate(tenantId, id) {
    const source = await this.getById(tenantId, id);
    const copyName = `${source.name} (Copy)`;
    const slug = await this._uniqueSlug(tenantId, slugify(copyName));
    const skuSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();

    const created = await this.create(tenantId, {
      category_id: source.category_id,
      brand_id: source.brand_id,
      branch_id: source.branch_id,
      name: copyName,
      slug,
      sku: source.sku ? `${source.sku}-COPY-${skuSuffix}` : null,
      barcode: null,
      product_type: source.product_type || 'simple',
      cost_price: source.cost_price,
      sale_price: source.sale_price,
      stock_quantity: source.stock_quantity,
      low_stock_threshold: source.low_stock_threshold,
      description: source.description,
      status: 'draft',
      meta_title: source.meta_title,
      meta_description: source.meta_description,
      variants: (source.variants || []).map((v) => ({
        name: v.name,
        sku: v.sku ? `${v.sku}-COPY-${skuSuffix}` : null,
        attributes: v.attributes,
        cost_price: v.cost_price,
        sale_price: v.sale_price,
        stock_quantity: v.stock_quantity,
      })),
    });

    if (source.images?.length) {
      const fresh = await this.getById(tenantId, created.id);
      const variantIdMap = new Map();
      (source.variants || []).forEach((oldV, i) => {
        const newV = fresh.variants?.[i];
        if (oldV.id && newV?.id) variantIdMap.set(oldV.id, newV.id);
      });

      for (const img of source.images) {
        const newVariantId = img.variant_id ? variantIdMap.get(img.variant_id) || null : null;
        await db.query(
          `INSERT INTO product_images (tenant_id, product_id, variant_id, url, alt_text, sort_order, is_primary)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            tenantId, created.id, newVariantId, img.url,
            img.alt_text || copyName, img.sort_order || 0, !!img.is_primary,
          ]
        );
      }
    }

    return this.getById(tenantId, created.id);
  }

  async importCsv(tenantId, rows, { mode = 'create' } = {}) {
    const { ValidationError } = require('../../shared/errors');
    if (!Array.isArray(rows) || !rows.length) throw new ValidationError('No rows to import');
    const created = [];
    const updated = [];
    const errors = [];
    for (let i = 0; i < Math.min(rows.length, 500); i += 1) {
      const row = rows[i];
      try {
        if (!row.name && !row.sku) {
          errors.push({ row: i + 1, message: 'name or sku required' });
          continue;
        }
        if (mode === 'update' && row.sku) {
          const existing = await db.query(
            'SELECT id FROM products WHERE tenant_id = $1 AND sku = $2',
            [tenantId, row.sku]
          );
          if (existing.rows[0]) {
            const product = await this.update(tenantId, existing.rows[0].id, {
              name: row.name || undefined,
              sale_price: row.sale_price != null ? parseFloat(row.sale_price) : undefined,
              cost_price: row.cost_price != null ? parseFloat(row.cost_price) : undefined,
              stock_quantity: row.stock_quantity != null ? parseInt(row.stock_quantity, 10) : undefined,
              status: row.status || undefined,
            });
            updated.push(product);
            continue;
          }
        }
        if (!row.name || row.sale_price == null) {
          errors.push({ row: i + 1, message: 'name and sale_price required for create' });
          continue;
        }
        const product = await this.create(tenantId, {
          name: String(row.name).trim(),
          sku: row.sku || null,
          barcode: row.barcode || null,
          sale_price: parseFloat(row.sale_price) || 0,
          cost_price: parseFloat(row.cost_price) || 0,
          stock_quantity: parseInt(row.stock_quantity, 10) || 0,
          product_type: row.product_type || 'simple',
          status: row.status || 'active',
        });
        created.push(product);
      } catch (err) {
        errors.push({ row: i + 1, message: err.message });
      }
    }
    return { imported: created.length, updated: updated.length, errors, products: created };
  }
}

module.exports = new ProductService();
