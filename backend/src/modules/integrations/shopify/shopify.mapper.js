const db = require('../../../config/database');
const logger = require('../../../utils/logger');
const { slugify } = require('../../../utils/helpers');
const uploadService = require('../../../services/upload.service');

// Extract numeric id from a Shopify GID, e.g. gid://shopify/Product/123 -> "123"
function gidId(gid) {
  if (!gid) return null;
  const parts = String(gid).split('/');
  return parts[parts.length - 1] || null;
}

function mapStatus(shopifyStatus) {
  switch (String(shopifyStatus || '').toUpperCase()) {
    case 'ACTIVE':
      return 'active';
    case 'ARCHIVED':
      return 'inactive';
    case 'DRAFT':
    default:
      return 'draft';
  }
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function variantUnitCost(variant) {
  const cost = variant.inventoryItem && variant.inventoryItem.unitCost && variant.inventoryItem.unitCost.amount;
  return toNumber(cost) || 0;
}

function isRealOptionSet(options, variants) {
  const hasRealOption = (options || []).some(
    (o) => !(o.name === 'Title' && (o.values || []).length === 1 && o.values[0] === 'Default Title')
  );
  return hasRealOption || (variants || []).length > 1;
}

async function uniqueSlug(client, tenantId, baseSlug, excludeProductId = null) {
  let slug = baseSlug || `product-${Date.now()}`;
  let counter = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const params = [tenantId, slug];
    let sql = 'SELECT id FROM products WHERE tenant_id = $1 AND slug = $2';
    if (excludeProductId) {
      sql += ' AND id <> $3';
      params.push(excludeProductId);
    }
    sql += ' LIMIT 1';
    // eslint-disable-next-line no-await-in-loop
    const res = await client.query(sql, params);
    if (!res.rows[0]) return slug;
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}

// Find or create a brand for the Shopify vendor.
async function resolveBrand(client, tenantId, vendor) {
  if (!vendor) return null;
  const name = String(vendor).trim();
  if (!name) return null;
  const existing = await client.query(
    'SELECT id FROM brands WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1',
    [tenantId, name]
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const slug = await (async () => {
    let base = slugify(name) || `brand-${Date.now()}`;
    let s = base;
    let i = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const r = await client.query('SELECT id FROM brands WHERE tenant_id = $1 AND slug = $2 LIMIT 1', [tenantId, s]);
      if (!r.rows[0]) return s;
      i += 1;
      s = `${base}-${i}`;
    }
  })();
  const created = await client.query(
    'INSERT INTO brands (tenant_id, name, slug) VALUES ($1, $2, $3) RETURNING id',
    [tenantId, name, slug]
  );
  return created.rows[0].id;
}

// Map Shopify collections -> categories, returns first category id to assign.
async function resolveCategory(client, tenantId, collections, settings) {
  if (!settings.importCollections || !collections || !collections.length) return null;
  let firstCategoryId = null;
  for (const col of collections) {
    const shopifyCollectionId = gidId(col.id);
    if (!shopifyCollectionId) continue;
    // eslint-disable-next-line no-await-in-loop
    const mapped = await client.query(
      'SELECT category_id FROM shopify_collection_map WHERE tenant_id = $1 AND shopify_collection_id = $2',
      [tenantId, shopifyCollectionId]
    );
    let categoryId = mapped.rows[0] && mapped.rows[0].category_id;

    if (!categoryId) {
      // Match by slug/name before creating
      const slug = slugify(col.handle || col.title || '');
      // eslint-disable-next-line no-await-in-loop
      const bySlug = await client.query(
        'SELECT id FROM categories WHERE tenant_id = $1 AND (slug = $2 OR LOWER(name) = LOWER($3)) LIMIT 1',
        [tenantId, slug, col.title || '']
      );
      if (bySlug.rows[0]) {
        categoryId = bySlug.rows[0].id;
      } else if (settings.createMissingCategories) {
        let uSlug = slug || `category-${Date.now()}`;
        let i = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          // eslint-disable-next-line no-await-in-loop
          const r = await client.query('SELECT id FROM categories WHERE tenant_id = $1 AND slug = $2 LIMIT 1', [tenantId, uSlug]);
          if (!r.rows[0]) break;
          i += 1;
          uSlug = `${slug}-${i}`;
        }
        // eslint-disable-next-line no-await-in-loop
        const createdCat = await client.query(
          'INSERT INTO categories (tenant_id, name, slug) VALUES ($1, $2, $3) RETURNING id',
          [tenantId, col.title || uSlug, uSlug]
        );
        categoryId = createdCat.rows[0].id;
      }

      if (categoryId) {
        // eslint-disable-next-line no-await-in-loop
        await client.query(
          `INSERT INTO shopify_collection_map (tenant_id, shopify_collection_id, category_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (tenant_id, shopify_collection_id) DO UPDATE SET category_id = EXCLUDED.category_id`,
          [tenantId, shopifyCollectionId, categoryId]
        );
      }
    }

    if (categoryId && !firstCategoryId) firstCategoryId = categoryId;
  }
  return firstCategoryId;
}

// Download a remote image and store it via the upload service. Returns the public url or null.
async function importImage(tenantId, imageUrl) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const mimetype = res.headers.get('content-type') || 'image/jpeg';
    const extFromType = mimetype.split('/')[1] ? `.${mimetype.split('/')[1].split(';')[0]}` : '.jpg';
    const clean = imageUrl.split('?')[0];
    const baseName = clean.substring(clean.lastIndexOf('/') + 1) || `image${extFromType}`;
    const originalname = baseName.includes('.') ? baseName : `${baseName}${extFromType}`;
    const saved = await uploadService.saveFile(
      { originalname, buffer, mimetype, size: buffer.length },
      { subfolder: `tenants/${tenantId}/products` }
    );
    return saved.url;
  } catch (err) {
    logger.warn('Shopify image import failed', { imageUrl, error: err.message });
    return null;
  }
}

/**
 * Upsert a single (assembled) Shopify product into the catalog.
 * `product` = product node fields + { variants:[], images:[], collections:[] }
 * Returns a result describing what happened and collects non-fatal errors.
 */
async function upsertProduct(tenantId, connectionId, product, settings, counters) {
  const client = await db.getClient();
  const result = { created: false, updated: false, variants: 0, images: 0, errors: [] };
  try {
    await client.query('BEGIN');

    const shopifyProductId = gidId(product.id);
    const variants = settings.importVariants === false ? (product.variants || []).slice(0, 1) : (product.variants || []);
    const isVariable = isRealOptionSet(product.options, product.variants);
    const productType = isVariable ? 'variable' : 'simple';
    const status = mapStatus(product.status);
    const brandId = await resolveBrand(client, tenantId, product.vendor);
    const categoryId = await resolveCategory(client, tenantId, product.collections, settings);
    const tags = Array.isArray(product.tags) ? product.tags : (product.tags ? String(product.tags).split(',').map((t) => t.trim()) : []);

    // Pricing comes from the first variant for the base product
    const primaryVariant = variants[0] || {};
    const basePrice = toNumber(primaryVariant.price) || 0;
    const baseCompareAt = toNumber(primaryVariant.compareAtPrice);
    const baseCost = variantUnitCost(primaryVariant);
    const baseSku = primaryVariant.sku || null;
    const baseBarcode = primaryVariant.barcode || null;
    const baseStock = Number.isFinite(primaryVariant.inventoryQuantity) ? primaryVariant.inventoryQuantity : 0;

    // ---- Match existing product: map table -> SKU ----
    let existingProductId = null;
    const mapRes = await client.query(
      'SELECT product_id FROM shopify_product_map WHERE tenant_id = $1 AND shopify_product_id = $2',
      [tenantId, shopifyProductId]
    );
    if (mapRes.rows[0]) {
      const check = await client.query('SELECT id FROM products WHERE id = $1 AND tenant_id = $2', [mapRes.rows[0].product_id, tenantId]);
      if (check.rows[0]) existingProductId = check.rows[0].id;
    }
    if (!existingProductId && baseSku) {
      const bySku = await client.query(
        'SELECT id FROM products WHERE tenant_id = $1 AND sku = $2 LIMIT 1',
        [tenantId, baseSku]
      );
      if (bySku.rows[0]) existingProductId = bySku.rows[0].id;
    }

    let productId = existingProductId;
    const commonFields = {
      name: product.title || 'Untitled product',
      description: product.descriptionHtml || null,
      product_type: productType,
      status,
      vendor: product.vendor || null,
      tags,
      compare_at_price: baseCompareAt,
      sale_price: basePrice,
      cost_price: baseCost,
      sku: baseSku,
      barcode: baseBarcode,
      stock_quantity: isVariable ? 0 : baseStock,
      brand_id: brandId,
      category_id: categoryId,
    };

    if (existingProductId) {
      if (settings.updateExisting === false) {
        await client.query('COMMIT');
        result.skipped = true;
        return result;
      }
      // Only overwrite category/brand if we resolved one (don't wipe manual data)
      await client.query(
        `UPDATE products SET
           name = $1, description = $2, product_type = $3, status = $4,
           vendor = $5, tags = $6, compare_at_price = $7, sale_price = $8,
           cost_price = $9, sku = $10, barcode = $11, stock_quantity = $12,
           brand_id = COALESCE($13, brand_id), category_id = COALESCE($14, category_id),
           updated_at = NOW()
         WHERE id = $15 AND tenant_id = $16`,
        [
          commonFields.name, commonFields.description, commonFields.product_type, commonFields.status,
          commonFields.vendor, commonFields.tags, commonFields.compare_at_price, commonFields.sale_price,
          commonFields.cost_price, commonFields.sku, commonFields.barcode, commonFields.stock_quantity,
          commonFields.brand_id, commonFields.category_id, existingProductId, tenantId,
        ]
      );
      productId = existingProductId;
      result.updated = true;
    } else {
      const slug = await uniqueSlug(client, tenantId, slugify(product.handle || product.title || ''));
      const inserted = await client.query(
        `INSERT INTO products
           (tenant_id, name, slug, description, product_type, status, vendor, tags,
            compare_at_price, sale_price, cost_price, sku, barcode, stock_quantity, brand_id, category_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING id`,
        [
          tenantId, commonFields.name, slug, commonFields.description, commonFields.product_type, commonFields.status,
          commonFields.vendor, commonFields.tags, commonFields.compare_at_price, commonFields.sale_price,
          commonFields.cost_price, commonFields.sku, commonFields.barcode, commonFields.stock_quantity,
          commonFields.brand_id, commonFields.category_id,
        ]
      );
      productId = inserted.rows[0].id;
      result.created = true;
    }

    // Upsert product map
    await client.query(
      `INSERT INTO shopify_product_map (tenant_id, connection_id, shopify_product_id, product_id, handle, shopify_updated_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (tenant_id, shopify_product_id)
       DO UPDATE SET product_id = EXCLUDED.product_id, handle = EXCLUDED.handle,
                     shopify_updated_at = EXCLUDED.shopify_updated_at, updated_at = NOW()`,
      [tenantId, connectionId, shopifyProductId, productId, product.handle || null, product.updatedAt || null]
    );

    // ---- Variants (only for variable products) ----
    const variantIdByShopify = new Map();
    if (isVariable) {
      for (const v of variants) {
        const shopifyVariantId = gidId(v.id);
        const attributes = {};
        (v.selectedOptions || []).forEach((opt) => {
          if (opt && opt.name && opt.name !== 'Title') attributes[opt.name] = opt.value;
        });
        const vName = (v.selectedOptions || [])
          .filter((o) => o.name !== 'Title')
          .map((o) => o.value)
          .join(' / ') || v.title || 'Default';
        const vPrice = toNumber(v.price) || 0;
        const vCompare = toNumber(v.compareAtPrice);
        const vCost = variantUnitCost(v);
        const vStock = Number.isFinite(v.inventoryQuantity) ? v.inventoryQuantity : 0;

        // Match variant: map -> SKU -> create
        let variantId = null;
        // eslint-disable-next-line no-await-in-loop
        const vMap = await client.query(
          'SELECT variant_id FROM shopify_variant_map WHERE tenant_id = $1 AND shopify_variant_id = $2',
          [tenantId, shopifyVariantId]
        );
        if (vMap.rows[0]) {
          // eslint-disable-next-line no-await-in-loop
          const vCheck = await client.query('SELECT id FROM product_variants WHERE id = $1 AND tenant_id = $2', [vMap.rows[0].variant_id, tenantId]);
          if (vCheck.rows[0]) variantId = vCheck.rows[0].id;
        }
        if (!variantId && v.sku) {
          // eslint-disable-next-line no-await-in-loop
          const vBySku = await client.query(
            'SELECT id FROM product_variants WHERE tenant_id = $1 AND product_id = $2 AND sku = $3 LIMIT 1',
            [tenantId, productId, v.sku]
          );
          if (vBySku.rows[0]) variantId = vBySku.rows[0].id;
        }

        if (variantId) {
          // eslint-disable-next-line no-await-in-loop
          await client.query(
            `UPDATE product_variants SET name=$1, sku=$2, barcode=$3, attributes=$4,
               cost_price=$5, sale_price=$6, compare_at_price=$7, stock_quantity=$8, updated_at=NOW()
             WHERE id=$9 AND tenant_id=$10`,
            [vName, v.sku || null, v.barcode || null, JSON.stringify(attributes), vCost, vPrice, vCompare, vStock, variantId, tenantId]
          );
        } else {
          // eslint-disable-next-line no-await-in-loop
          const insV = await client.query(
            `INSERT INTO product_variants
               (tenant_id, product_id, name, sku, barcode, attributes, cost_price, sale_price, compare_at_price, stock_quantity)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
            [tenantId, productId, vName, v.sku || null, v.barcode || null, JSON.stringify(attributes), vCost, vPrice, vCompare, vStock]
          );
          variantId = insV.rows[0].id;
        }

        // eslint-disable-next-line no-await-in-loop
        await client.query(
          `INSERT INTO shopify_variant_map (tenant_id, shopify_variant_id, variant_id, product_id, sku)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (tenant_id, shopify_variant_id)
           DO UPDATE SET variant_id = EXCLUDED.variant_id, product_id = EXCLUDED.product_id, sku = EXCLUDED.sku, updated_at = NOW()`,
          [tenantId, shopifyVariantId, variantId, productId, v.sku || null]
        );
        if (shopifyVariantId) variantIdByShopify.set(shopifyVariantId, variantId);
        result.variants += 1;
      }
    }

    // ---- Images ----
    if (settings.importImages !== false) {
      // Replace existing imported images to stay in sync (only on update if any present)
      const existingImgs = await client.query(
        'SELECT COUNT(*)::int AS c FROM product_images WHERE product_id = $1 AND tenant_id = $2',
        [productId, tenantId]
      );
      const hasImages = existingImgs.rows[0].c > 0;

      if (!hasImages) {
        const featuredUrl = product.featuredImage && product.featuredImage.url;
        const imageList = Array.isArray(product.images) ? product.images : [];
        let sort = 0;
        for (const img of imageList) {
          const srcUrl = img.url || img.src;
          if (!srcUrl) continue;
          // eslint-disable-next-line no-await-in-loop
          const storedUrl = await importImage(tenantId, srcUrl);
          if (!storedUrl) {
            result.errors.push({ type: 'image', message: `Failed to download image for ${product.title}` });
            continue;
          }
          const isPrimary = featuredUrl ? srcUrl === featuredUrl : sort === 0;
          // eslint-disable-next-line no-await-in-loop
          await client.query(
            `INSERT INTO product_images (tenant_id, product_id, url, alt_text, sort_order, is_primary)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [tenantId, productId, storedUrl, img.altText || product.title || null, sort, isPrimary]
          );
          sort += 1;
          result.images += 1;
        }
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('Shopify product upsert failed', { product: product && product.title, error: err.message });
    result.errors.push({ type: 'product', product: product && product.title, message: err.message });
  } finally {
    client.release();
  }

  if (counters) {
    if (result.created) counters.products_imported = (counters.products_imported || 0) + 1;
    if (result.updated) counters.products_updated = (counters.products_updated || 0) + 1;
    counters.variants_imported = (counters.variants_imported || 0) + result.variants;
    counters.images_imported = (counters.images_imported || 0) + result.images;
    if (result.errors.length) counters.errors = (counters.errors || 0) + result.errors.length;
  }

  return result;
}

module.exports = { upsertProduct, gidId, mapStatus };
