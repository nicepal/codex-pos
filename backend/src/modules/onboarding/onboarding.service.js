const db = require('../../config/database');
const { ValidationError, NotFoundError, ConflictError } = require('../../shared/errors');
const { slugify } = require('../../utils/helpers');
const branchStockService = require('../inventory/branch-stock.service');
const { BUSINESS_TYPES, getBusinessType, isValidBusinessType } = require('./business-types');
const { getTemplate, summarizeTemplate } = require('./templates');
const { sku, catSlug } = require('./templates/_helpers');
const logger = require('../../utils/logger');
const restaurantEntitlementService = require('../restaurant/restaurant-entitlement.service');

const ACTIVE_STATUSES = new Set(['not_started', 'in_progress', 'failed']);
const DONE_STATUSES = new Set(['completed', 'skipped']);

function needsOnboarding(status) {
  if (!status) return false; // null/undefined treated as completed for legacy tenants
  return ACTIVE_STATUSES.has(status);
}

class OnboardingService {
  listBusinessTypes() {
    return BUSINESS_TYPES.map((t) => {
      const summary = summarizeTemplate(t.id);
      return {
        ...t,
        estimatedCategories: summary?.categories ?? t.estimatedCategories,
        estimatedProducts: summary?.products ?? t.estimatedProducts,
      };
    });
  }

  async getTenant(tenantId, client = db) {
    const result = await client.query(
      `SELECT id, name, slug, currency, timezone, business_type, onboarding_status, settings
       FROM tenants WHERE id = $1`,
      [tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Tenant not found');
    return result.rows[0];
  }

  async getStatus(tenantId) {
    const tenant = await this.getTenant(tenantId);
    const progress = (tenant.settings && tenant.settings.onboarding) || {};
    const typeMeta = tenant.business_type ? getBusinessType(tenant.business_type) : null;
    const summary = tenant.business_type ? summarizeTemplate(tenant.business_type) : null;

    return {
      business_type: tenant.business_type,
      business_type_label: typeMeta?.label || null,
      onboarding_status: tenant.onboarding_status || 'completed',
      needs_onboarding: needsOnboarding(tenant.onboarding_status),
      progress: {
        step: progress.step || null,
        message: progress.message || null,
        categories_created: progress.categories_created || 0,
        products_created: progress.products_created || 0,
        products_skipped: progress.products_skipped || 0,
        images_attached: progress.images_attached || 0,
        stock_seeded: progress.stock_seeded || 0,
        total_categories: summary?.categories || progress.total_categories || 0,
        total_products: summary?.products || progress.total_products || 0,
        error: progress.error || null,
        completed_at: progress.completed_at || null,
      },
      template: summary,
    };
  }

  async selectBusinessType(tenantId, businessType, userId) {
    if (!isValidBusinessType(businessType)) {
      throw new ValidationError('Invalid business type');
    }

    const tenant = await this.getTenant(tenantId);
    if (DONE_STATUSES.has(tenant.onboarding_status)) {
      throw new ConflictError('Onboarding already finished for this business');
    }

    const summary = summarizeTemplate(businessType);
    const settings = {
      ...(tenant.settings || {}),
      onboarding: {
        ...(tenant.settings?.onboarding || {}),
        step: 'type_selected',
        message: `Selected ${getBusinessType(businessType).label}`,
        total_categories: summary.categories,
        total_products: summary.products,
        error: null,
      },
    };

    await db.query(
      `UPDATE tenants
       SET business_type = $1,
           onboarding_status = 'in_progress',
           settings = $2::jsonb,
           updated_at = NOW()
       WHERE id = $3`,
      [businessType, JSON.stringify(settings), tenantId]
    );

    await restaurantEntitlementService.syncForBusinessType(tenantId, businessType);

    await this._audit(tenantId, userId, 'onboarding.select_type', { business_type: businessType });

    return this.getStatus(tenantId);
  }

  async skip(tenantId, userId) {
    const tenant = await this.getTenant(tenantId);
    if (tenant.onboarding_status === 'completed') {
      return this.getStatus(tenantId);
    }

    const settings = {
      ...(tenant.settings || {}),
      onboarding: {
        ...(tenant.settings?.onboarding || {}),
        step: 'skipped',
        message: 'Onboarding skipped — empty catalog',
        skipped_at: new Date().toISOString(),
      },
    };

    await db.query(
      `UPDATE tenants
       SET onboarding_status = 'skipped',
           settings = $1::jsonb,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(settings), tenantId]
    );

    await db.query(
      `INSERT INTO settings (tenant_id, key, value)
       VALUES ($1, 'onboarding_complete', 'true'::jsonb)
       ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [tenantId]
    ).catch(() => {});

    await this._audit(tenantId, userId, 'onboarding.skip', {});
    return this.getStatus(tenantId);
  }

  /**
   * Idempotent catalog setup for the selected business type.
   * Uses tenant_id from auth context only — never from body.
   */
  async setup(tenantId, userId) {
    const tenant = await this.getTenant(tenantId);

    if (tenant.onboarding_status === 'completed') {
      return { ...await this.getStatus(tenantId), already_complete: true };
    }
    if (tenant.onboarding_status === 'skipped') {
      throw new ConflictError('Onboarding was skipped. Catalog was not seeded.');
    }
    if (!tenant.business_type) {
      throw new ValidationError('Select a business type before running setup');
    }

    const template = getTemplate(tenant.business_type);
    if (!template) throw new ValidationError('No template for this business type');

    const client = await db.getClient();
    const counters = {
      categories_created: 0,
      products_created: 0,
      products_skipped: 0,
      images_attached: 0,
      stock_seeded: 0,
      total_categories: template.categories.length,
      total_products: template.categories.reduce((n, c) => n + c.products.length, 0),
    };

    try {
      await client.query('BEGIN');

      await this._setProgress(client, tenantId, {
        step: 'ensuring_branch',
        message: 'Preparing your main branch…',
        ...counters,
      });

      const branchId = await this._ensurePrimaryBranch(client, tenantId, tenant.name);

      await this._setProgress(client, tenantId, {
        step: 'creating_catalog',
        message: 'Creating categories and products…',
        ...counters,
      });

      // Do not attach solid-color placeholder images — storefront shows a neutral
      // empty state until the merchant uploads real product photos.
      for (const category of template.categories) {
        const categoryId = await this._ensureCategory(client, tenantId, tenant.business_type, category);
        if (categoryId.created) counters.categories_created += 1;

        for (const prod of category.products) {
          const productSku = sku(tenant.business_type, prod.code);
          const existing = await client.query(
            `SELECT id FROM products WHERE tenant_id = $1 AND sku = $2 LIMIT 1`,
            [tenantId, productSku]
          );

          let productId;
          if (existing.rows[0]) {
            productId = existing.rows[0].id;
            counters.products_skipped += 1;
          } else {
            productId = await this._createProduct(client, tenantId, branchId, categoryId.id, tenant.business_type, prod);
            counters.products_created += 1;
          }

          const stockQty = await branchStockService.getQuantity(tenantId, branchId, productId, null, client);
          if (stockQty === 0 && !prod.variants?.length) {
            await branchStockService.adjust(tenantId, {
              branch_id: branchId,
              product_id: productId,
              quantity: prod.stock || 25,
              reference_type: 'onboarding',
              notes: 'Codex POS starter stock',
            }, 'stock_in', userId, client);
            counters.stock_seeded += 1;
          } else if (prod.variants?.length) {
            const variants = await client.query(
              'SELECT id, sku, stock_quantity FROM product_variants WHERE tenant_id = $1 AND product_id = $2',
              [tenantId, productId]
            );
            for (const v of variants.rows) {
              const vQty = await branchStockService.getQuantity(tenantId, branchId, productId, v.id, client);
              if (vQty === 0) {
                const seedQty = v.stock_quantity || 10;
                await branchStockService.adjust(tenantId, {
                  branch_id: branchId,
                  product_id: productId,
                  variant_id: v.id,
                  quantity: seedQty,
                  reference_type: 'onboarding',
                  notes: 'Codex POS starter stock',
                }, 'stock_in', userId, client);
                counters.stock_seeded += 1;
              }
            }
          }

          await this._setProgress(client, tenantId, {
            step: 'creating_catalog',
            message: `Added ${counters.products_created + counters.products_skipped} of ${counters.total_products} products…`,
            ...counters,
          });
        }
      }

      const settingsRow = await client.query('SELECT settings FROM tenants WHERE id = $1', [tenantId]);
      const settings = {
        ...(settingsRow.rows[0].settings || {}),
        onboarding: {
          step: 'completed',
          message: 'Your starter catalog is ready',
          ...counters,
          completed_at: new Date().toISOString(),
          error: null,
          starter_marked: true,
        },
      };

      await client.query(
        `UPDATE tenants
         SET onboarding_status = 'completed',
             settings = $1::jsonb,
             updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(settings), tenantId]
      );

      await client.query(
        `INSERT INTO settings (tenant_id, key, value)
         VALUES ($1, 'onboarding_complete', 'true'::jsonb)
         ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [tenantId]
      );

      await client.query('COMMIT');

      await this._audit(tenantId, userId, 'onboarding.setup_complete', counters);

      return {
        ...(await this.getStatus(tenantId)),
        created: counters,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Onboarding setup failed', { tenantId, error: err.message });

      try {
        const t = await this.getTenant(tenantId);
        const settings = {
          ...(t.settings || {}),
          onboarding: {
            ...(t.settings?.onboarding || {}),
            step: 'failed',
            message: 'Setup failed — you can retry safely',
            error: err.message,
            ...counters,
          },
        };
        await db.query(
          `UPDATE tenants SET onboarding_status = 'failed', settings = $1::jsonb, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(settings), tenantId]
        );
      } catch (e) {
        logger.warn('Failed to persist onboarding failure status', { error: e.message });
      }

      throw err;
    } finally {
      client.release();
    }
  }

  async _ensurePrimaryBranch(client, tenantId, businessName) {
    const existing = await client.query(
      `SELECT id FROM branches WHERE tenant_id = $1 ORDER BY is_primary DESC, created_at ASC LIMIT 1`,
      [tenantId]
    );
    if (existing.rows[0]) return existing.rows[0].id;

    const created = await client.query(
      `INSERT INTO branches (tenant_id, name, code, is_primary, status)
       VALUES ($1, $2, 'MAIN', true, 'active')
       RETURNING id`,
      [tenantId, businessName || 'Main Store']
    );
    return created.rows[0].id;
  }

  async _ensureCategory(client, tenantId, businessType, category) {
    const slug = catSlug(businessType, category.slug);
    const existing = await client.query(
      'SELECT id FROM categories WHERE tenant_id = $1 AND slug = $2 LIMIT 1',
      [tenantId, slug]
    );
    if (existing.rows[0]) return { id: existing.rows[0].id, created: false };

    const inserted = await client.query(
      `INSERT INTO categories (tenant_id, name, slug, description, status, sort_order)
       VALUES ($1, $2, $3, $4, 'active', $5)
       RETURNING id`,
      [
        tenantId,
        category.name,
        slug,
        `Codex POS starter category (${businessType})`,
        category.sort_order || 0,
      ]
    );
    return { id: inserted.rows[0].id, created: true };
  }

  async _createProduct(client, tenantId, branchId, categoryId, businessType, prod) {
    const productSku = sku(businessType, prod.code);
    const baseSlug = slugify(prod.name) || prod.code.toLowerCase();
    let slug = `ob-${businessType}-${baseSlug}`;
    const slugCheck = await client.query(
      'SELECT id FROM products WHERE tenant_id = $1 AND slug = $2',
      [tenantId, slug]
    );
    if (slugCheck.rows[0]) slug = `${slug}-${prod.code.toLowerCase()}`;

    const hasVariants = Array.isArray(prod.variants) && prod.variants.length > 0;
    const inserted = await client.query(
      `INSERT INTO products (
         tenant_id, category_id, branch_id, name, slug, sku,
         product_type, cost_price, sale_price, stock_quantity, status, description
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11)
       RETURNING id`,
      [
        tenantId,
        categoryId,
        branchId,
        prod.name,
        slug,
        productSku,
        hasVariants ? 'variable' : 'simple',
        prod.cost_price || 0,
        prod.sale_price,
        hasVariants ? 0 : 0, // stock via branch_stock
        null, // no internal onboarding copy on customer-facing descriptions
      ]
    );
    const productId = inserted.rows[0].id;

    if (hasVariants) {
      for (const v of prod.variants) {
        const vSku = `${productSku}-${v.sku_suffix || slugify(v.name).toUpperCase()}`;
        await client.query(
          `INSERT INTO product_variants (
             tenant_id, product_id, name, sku, attributes, cost_price, sale_price, stock_quantity
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            tenantId,
            productId,
            v.name,
            vSku,
            JSON.stringify(v.attributes || {}),
            v.cost_price ?? prod.cost_price ?? 0,
            v.sale_price ?? prod.sale_price,
            0,
          ]
        );
      }
    }

    return productId;
  }

  async _setProgress(_client, tenantId, progress) {
    // Use pool connection so GET /status can poll live progress during setup
    await db.query(
      `UPDATE tenants
       SET onboarding_status = CASE
             WHEN onboarding_status IN ('completed', 'skipped') THEN onboarding_status
             ELSE 'in_progress'
           END,
           settings = jsonb_set(
             COALESCE(settings, '{}'::jsonb),
             '{onboarding}',
             COALESCE(settings->'onboarding', '{}'::jsonb) || $1::jsonb,
             true
           ),
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(progress), tenantId]
    );
  }

  async _audit(tenantId, userId, action, values) {
    try {
      await db.query(
        `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, $2, $3, 'onboarding', $1, $4)`,
        [tenantId, userId || null, action, JSON.stringify(values || {})]
      );
    } catch {
      // optional — never block onboarding on audit failure
    }
  }
}

OnboardingService.needsOnboarding = needsOnboarding;

module.exports = new OnboardingService();
