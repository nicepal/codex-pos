const db = require('../../config/database');
const BaseRepository = require('../../shared/base.repository');
const { generateOrderNumber } = require('../../utils/helpers');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const branchStockService = require('../inventory/branch-stock.service');
const { applyTaxToResolvedItems } = require('../../services/tax.service');
const { resolveTenantFeatures, isFeatureEnabled } = require('../../shared/features');
const { derivePaymentFields, restockQtyAfterReturns, allocateProportionalRefund } = require('./orders.helpers');
const { resolveModifierSelections } = require('../modifiers/modifiers.helpers');
const {
  parsePreferenceValue,
  shouldEnforceRegisterSession,
  validateRegisterSessionState,
  pickDrawerForBranch,
} = require('./orders.register-gate');

/** Extract guest contact + ship-to from storefront checkout notes. */
function parseCustomerDetailsFromNotes(notes) {
  if (!notes || typeof notes !== 'string') return { guest: null, shipping_address: null };
  const name = notes.match(/(?:^|\||\n)\s*Name:\s*([^|\n]+)/i)?.[1]?.trim() || null;
  const email = notes.match(/(?:^|\||\n)\s*Email:\s*([^|\n]+)/i)?.[1]?.trim() || null;
  const phone = notes.match(/(?:^|\||\n)\s*Phone:\s*([^|\n]+)/i)?.[1]?.trim() || null;
  const shipTo = notes.match(/(?:^|\||\n)\s*Ship to:\s*([^|\n]+)/i)?.[1]?.trim() || null;
  return {
    guest: (name || email || phone) ? { name, email, phone } : null,
    shipping_address: shipTo ? { formatted: shipTo, line1: shipTo } : null,
  };
}

function formatCustomerAddress(customer) {
  if (!customer) return null;
  const lines = [
    customer.address,
    [customer.city, customer.state, customer.postal_code].filter(Boolean).join(', '),
    customer.country,
  ].filter(Boolean);
  if (!lines.length) return null;
  return {
    formatted: lines.join(', '),
    line1: customer.address || null,
    line2: null,
    city: customer.city || null,
    postal_code: customer.postal_code || null,
    country: customer.country || null,
    state: customer.state || null,
  };
}

class OrderRepository extends BaseRepository {
  constructor() {
    super('orders');
  }

  async findWithItems(tenantId, id) {
    const order = await this.findById(id, tenantId);
    if (!order) return null;
    const items = await db.query(
      `SELECT oi.*,
         COALESCE((
           SELECT SUM(ori.quantity)::int
           FROM order_return_items ori
           JOIN order_returns r ON r.id = ori.return_id AND r.tenant_id = oi.tenant_id
           WHERE ori.order_item_id = oi.id
         ), 0) AS returned_quantity
       FROM order_items oi
       WHERE oi.order_id = $1 AND oi.tenant_id = $2`,
      [id, tenantId]
    );
    return { ...order, items: items.rows };
  }
}

class OrderService {
  constructor() {
    this.repo = new OrderRepository();
  }

  async _getSettingPreference(tenantId, key, defaultValue) {
    const result = await db.query(
      'SELECT value FROM settings WHERE tenant_id = $1 AND key = $2',
      [tenantId, key]
    );
    return parsePreferenceValue(result.rows[0]?.value, defaultValue);
  }

  async _validateRegisterSession(tenantId, features, data) {
    const requireRegister = await this._getSettingPreference(tenantId, 'require_register_session', true);
    if (!shouldEnforceRegisterSession({
      features,
      preferences: { require_register_session: requireRegister },
      orderType: data.order_type,
      status: data.status || 'paid',
    })) {
      return;
    }

    const branchId = data.branch_id || null;
    const employeeId = data.employee_id || null;
    const drawerService = require('../drawer/drawer.service');
    const shiftsService = require('../shifts/shifts.service');

    const openDrawers = await drawerService.listOpen(tenantId, { branch_id: branchId || undefined });
    const drawer = pickDrawerForBranch(openDrawers, branchId);

    let shift = null;
    if (employeeId) {
      shift = await shiftsService.current(tenantId, employeeId);
    } else {
      shift = await shiftsService.findOpenAtBranch(tenantId, branchId);
    }

    const result = validateRegisterSessionState({ shift, drawer, employeeId, branchId });
    if (!result.ok) throw new ValidationError(result.message);
  }

  async _validateReturnManagerAuth(tenantId, features, totalRefund, data) {
    if (!isFeatureEnabled(features, 'pos_pro')) return;
    const threshold = parseFloat(await this._getSettingPreference(tenantId, 'pos_return_manager_threshold', 100)) || 0;
    if (threshold <= 0 || totalRefund <= threshold) return;
    const { verifyManagerPin } = require('../employees/employees.auth');
    await verifyManagerPin(tenantId, data.manager_employee_id, data.manager_pin);
  }

  async _validatePosProFeatures(features, data, resolvedItems) {
    const hasVariant = data.items?.some((i) => i.variant_id) || resolvedItems?.some((i) => i.variant_id);
    if (hasVariant && !isFeatureEnabled(features, 'pos_pro')) {
      throw new ValidationError('POS Pro is required for variant sales');
    }
    const hasLineDiscount = data.items?.some((i) => parseFloat(i.discount) > 0);
    if (hasLineDiscount && !isFeatureEnabled(features, 'pos_pro')) {
      throw new ValidationError('POS Pro is required for line discounts');
    }
  }

  async _validateManagerDiscount(tenantId, features, subtotal, discountAmount, data) {
    if (discountAmount <= subtotal * 0.2) return;
    if (!isFeatureEnabled(features, 'pos_pro')) {
      throw new ValidationError('Discount exceeds allowed limit');
    }
    const { verifyManagerPin } = require('../employees/employees.auth');
    await verifyManagerPin(tenantId, data.manager_employee_id, data.manager_pin);
  }

  async _validatePriceOverrides(tenantId, features, data, resolvedItems) {
    const needsApproval = resolvedItems.some((item) => {
      const catalog = parseFloat(item.catalog_price ?? item.unit_price);
      const unit = parseFloat(item.unit_price);
      return Math.abs(unit - catalog) > 0.001 && !item.is_open_price;
    });
    if (!needsApproval) return;
    if (!isFeatureEnabled(features, 'pos_pro')) {
      throw new ValidationError('Price override requires POS Pro');
    }
    const { verifyManagerPin } = require('../employees/employees.auth');
    await verifyManagerPin(tenantId, data.manager_employee_id, data.manager_pin);
  }

  async _resolveLineItems(client, tenantId, items, {
    skipStockCheck = false,
    allowNegativeStock = false,
    branchId = null,
    features = {},
    orderData = {},
  } = {}) {
    if (!items?.length) throw new ValidationError('Order must have at least one item');

    const resolved = [];
    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      if (!qty || qty < 1) throw new ValidationError('Invalid quantity');

      let productId = item.product_id;
      const variantId = item.variant_id || null;
      let unitPrice;
      let productName;
      let sku;
      let stockQty;
      let isOpenPrice = false;
      let productType = 'simple';
      let categoryId = null;
      let taxRuleId = null;

      if (variantId) {
        const result = await client.query(
          `SELECT pv.*, p.name AS parent_name, p.id AS parent_product_id, p.is_open_price, p.product_type, p.category_id, p.tax_rule_id
           FROM product_variants pv
           JOIN products p ON p.id = pv.product_id AND p.tenant_id = $1
           WHERE pv.id = $2 AND pv.tenant_id = $1`,
          [tenantId, variantId]
        );
        const row = result.rows[0];
        if (!row) throw new NotFoundError('Variant not found');
        productId = row.parent_product_id;
        unitPrice = parseFloat(row.sale_price);
        productName = `${row.parent_name} - ${row.name}`;
        sku = row.sku;
        isOpenPrice = row.is_open_price;
        productType = row.product_type;
        categoryId = row.category_id;
        taxRuleId = row.tax_rule_id;
        if (branchId) {
          stockQty = await branchStockService.lockQuantity(tenantId, branchId, productId, variantId, client);
        } else {
          stockQty = row.stock_quantity;
        }
      } else if (productId) {
        const result = await client.query(
          `SELECT * FROM products WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
          [productId, tenantId]
        );
        const row = result.rows[0];
        if (!row) throw new NotFoundError('Product not found or inactive');
        if (row.product_type === 'bundle') {
          const bundleService = require('../products/catalog-bundle.service');
          const expanded = await bundleService.expandBundleForOrder(client, tenantId, productId, qty);
          resolved.push(...expanded.map((e) => ({
            ...e,
            discount: parseFloat(item.discount) || 0,
            tax: 0,
            category_id: row.category_id,
            tax_rule_id: row.tax_rule_id,
            product_type: 'bundle',
          })));
          continue;
        }
        unitPrice = parseFloat(row.sale_price);
        productName = row.name;
        sku = row.sku;
        isOpenPrice = row.is_open_price;
        productType = row.product_type;
        categoryId = row.category_id;
        taxRuleId = row.tax_rule_id;
        if (branchId) {
          stockQty = await branchStockService.lockQuantity(tenantId, branchId, productId, null, client);
        } else {
          stockQty = row.stock_quantity;
        }
      } else {
        throw new ValidationError('Each item must have product_id or variant_id');
      }

      const catalogPrice = unitPrice;
      let modifierSnapshot = [];
      if (productId) {
        if (item.selected_modifiers?.length) {
          if (!isFeatureEnabled(features, 'restaurant_pro')) {
            throw new ValidationError('Restaurant Pro is required for item modifiers');
          }
          const modifierResult = await resolveModifierSelections(
            client, tenantId, productId, item.selected_modifiers
          );
          modifierSnapshot = modifierResult.snapshot;
          unitPrice += modifierResult.modifierTotal;
        } else if (isFeatureEnabled(features, 'restaurant_pro')) {
          const modifierResult = await resolveModifierSelections(client, tenantId, productId, []);
          modifierSnapshot = modifierResult.snapshot;
          unitPrice += modifierResult.modifierTotal;
        }
      }

      if (item.unit_price != null && parseFloat(item.unit_price) !== unitPrice) {
        const requested = parseFloat(item.unit_price);
        if (isFeatureEnabled(features, 'open_price_items') && isOpenPrice) {
          unitPrice = requested;
        } else if (
          item.price_override_approved
          || (orderData.manager_employee_id && orderData.manager_pin)
        ) {
          unitPrice = requested;
        } else {
          throw new ValidationError(`Open price not allowed for ${productName}`);
        }
      }
      if (!skipStockCheck && !allowNegativeStock && stockQty < qty) {
        throw new ValidationError(`Insufficient stock for ${productName}`);
      }

      resolved.push({
        product_id: productId,
        variant_id: variantId,
        product_name: productName,
        sku,
        quantity: qty,
        unit_price: unitPrice,
        catalog_price: catalogPrice,
        is_open_price: isOpenPrice,
        discount: parseFloat(item.discount) || 0,
        tax: parseFloat(item.tax) || 0,
        category_id: categoryId,
        tax_rule_id: taxRuleId,
        product_type: productType,
        serial_numbers: item.serial_numbers || [],
        batch_id: item.batch_id || null,
        metadata: {
          modifiers: modifierSnapshot,
          notes: item.item_notes || null,
        },
      });
    }
    return resolved;
  }

  async _validateCustomer(client, tenantId, customerId) {
    if (!customerId) return;
    const result = await client.query(
      'SELECT id FROM customers WHERE id = $1 AND tenant_id = $2',
      [customerId, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Customer not found');
  }

  async _validateBranch(client, tenantId, branchId) {
    if (!branchId) return;
    const result = await client.query(
      'SELECT id FROM branches WHERE id = $1 AND tenant_id = $2',
      [branchId, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Branch not found');
  }

  async _validateRestaurantContext(client, tenantId, features, data, branchId) {
    if (!isFeatureEnabled(features, 'restaurant_pro')) {
      const hasRestaurantFields = data.dining_order_type || data.dining_session_id || data.table_id
        || data.guest_count || data.server_employee_id || data.send_to_kitchen;
      if (hasRestaurantFields) {
        throw new ValidationError('Restaurant Pro is required for dining orders');
      }
      return null;
    }

    const diningType = data.dining_order_type || null;
    if (!diningType) return null;

    if (diningType === 'takeaway' || diningType === 'delivery') {
      if (data.dining_session_id || data.table_id) {
        throw new ValidationError(`${diningType} orders cannot include table or session`);
      }
      return { diningType, diningSessionId: null, tableId: null, guestCount: data.guest_count || null };
    }

    if (diningType !== 'dine_in') return null;

    if (!data.table_id && !data.dining_session_id) {
      throw new ValidationError('Dine-in orders require a table or dining session');
    }

    let session = null;
    let tableId = data.table_id || null;

    if (data.dining_session_id) {
      const sessionRes = await client.query(
        `SELECT s.*, t.branch_id AS table_branch_id, t.name AS table_name
         FROM restaurant_table_sessions s
         JOIN restaurant_tables t ON t.id = s.table_id AND t.tenant_id = s.tenant_id
         WHERE s.id = $1 AND s.tenant_id = $2`,
        [data.dining_session_id, tenantId]
      );
      session = sessionRes.rows[0];
      if (!session) throw new NotFoundError('Dining session not found');
      if (session.status !== 'open') throw new ValidationError('Dining session is not open');
      tableId = session.table_id;
    } else if (tableId) {
      session = (await client.query(
        `SELECT s.*, t.branch_id AS table_branch_id, t.name AS table_name
         FROM restaurant_table_sessions s
         JOIN restaurant_tables t ON t.id = s.table_id AND t.tenant_id = s.tenant_id
         WHERE s.table_id = $1 AND s.tenant_id = $2 AND s.status = 'open'
         ORDER BY s.opened_at DESC LIMIT 1`,
        [tableId, tenantId]
      )).rows[0] || null;
    }

    if (tableId) {
      const tableRes = await client.query(
        'SELECT id, branch_id, status FROM restaurant_tables WHERE id = $1 AND tenant_id = $2',
        [tableId, tenantId]
      );
      const table = tableRes.rows[0];
      if (!table) throw new NotFoundError('Table not found');
      if (branchId && table.branch_id !== branchId) {
        throw new ValidationError('Table does not belong to the selected branch');
      }
      if (!session) {
        throw new ValidationError('Table has no active dining session');
      }
    }

    if (data.server_employee_id) {
      const emp = await client.query(
        'SELECT id FROM employees WHERE id = $1 AND tenant_id = $2',
        [data.server_employee_id, tenantId]
      );
      if (!emp.rows[0]) throw new NotFoundError('Server employee not found');
    }

    const guestCount = data.guest_count ?? session?.guest_count ?? null;

    return {
      diningType,
      diningSessionId: session?.id || data.dining_session_id || null,
      tableId,
      guestCount,
      serverEmployeeId: data.server_employee_id || session?.employee_id || null,
      kitchenStatus: data.send_to_kitchen ? 'pending' : null,
    };
  }

  async list(tenantId, query) {
    const filters = { status: query.status, order_type: query.order_type };
    if (query.branch_id) filters.branch_id = query.branch_id;
    const search = (query.search || query.q || '').trim();
    if (search) {
      // Surgical order_number lookup for POS receipt history / returns (tenant-scoped).
      const page = parseInt(query.page, 10) || 1;
      const limit = Math.min(parseInt(query.limit, 10) || 50, 100);
      const offset = (page - 1) * limit;
      const params = [tenantId, `%${search}%`];
      let where = `tenant_id = $1 AND order_number ILIKE $2`;
      if (filters.status) {
        params.push(filters.status);
        where += ` AND status = $${params.length}`;
      }
      if (filters.branch_id) {
        params.push(filters.branch_id);
        where += ` AND branch_id = $${params.length}`;
      }
      if (filters.order_type) {
        params.push(filters.order_type);
        where += ` AND order_type = $${params.length}`;
      }
      const count = await db.query(`SELECT COUNT(*)::int AS total FROM orders WHERE ${where}`, params);
      params.push(limit, offset);
      const rows = await db.query(
        `SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
      const total = count.rows[0].total;
      return { rows: rows.rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
    return this.repo.findAll(tenantId, {
      page: query.page,
      limit: query.limit,
      filters,
    });
  }

  async listHeld(tenantId) {
    const result = await db.query(
      `SELECT o.*, (SELECT COUNT(*)::int FROM order_items WHERE order_id = o.id) AS item_count
       FROM orders o WHERE o.tenant_id = $1 AND o.status = 'on_hold' ORDER BY o.held_at DESC NULLS LAST, o.created_at DESC`,
      [tenantId]
    );
    return result.rows;
  }

  async getReceipt(tenantId, id) {
    const order = await this.getById(tenantId, id);
    const tenant = await db.query('SELECT name, address, phone, email, logo_url, currency FROM tenants WHERE id = $1', [tenantId]);
    const settings = await db.query(`SELECT value FROM settings WHERE tenant_id = $1 AND key = 'receipt_footer'`, [tenantId]);
    const payments = await db.query('SELECT * FROM order_payments WHERE order_id = $1 AND tenant_id = $2', [id, tenantId]);

    let branch = null;
    if (order.branch_id) {
      const branchRes = await db.query(
        `SELECT id, name, code, address, phone, email FROM branches WHERE id = $1 AND tenant_id = $2`,
        [order.branch_id, tenantId]
      );
      branch = branchRes.rows[0] || null;
    }

    return {
      business: tenant.rows[0],
      branch,
      order,
      items: order.items,
      payments: payments.rows,
      footer: settings.rows[0]?.value || 'Thank you for your purchase!',
      printed_at: new Date().toISOString(),
    };
  }

  async getById(tenantId, id) {
    const order = await this.repo.findWithItems(tenantId, id);
    if (!order) throw new NotFoundError('Order not found');

    let customer = null;
    if (order.customer_id) {
      const result = await db.query(
        `SELECT id, name, email, phone, address, city, state, country, postal_code
         FROM customers WHERE id = $1 AND tenant_id = $2`,
        [order.customer_id, tenantId]
      );
      customer = result.rows[0] || null;
    }

    const parsed = parseCustomerDetailsFromNotes(order.notes);
    if (!customer && parsed.guest) {
      customer = {
        id: null,
        name: parsed.guest.name,
        email: parsed.guest.email,
        phone: parsed.guest.phone,
        address: null,
        city: null,
        state: null,
        country: null,
        postal_code: null,
      };
    } else if (customer && parsed.guest) {
      customer = {
        ...customer,
        name: customer.name || parsed.guest.name,
        email: customer.email || parsed.guest.email,
        phone: customer.phone || parsed.guest.phone,
      };
    }

    const shipping_address = parsed.shipping_address || formatCustomerAddress(customer);

    let createdBy = null;
    if (order.created_by) {
      const result = await db.query('SELECT id, first_name, last_name, email FROM users WHERE id = $1', [order.created_by]);
      createdBy = result.rows[0] || null;
    }

    let tableName = null;
    let serverName = null;
    if (order.table_id) {
      const tableRes = await db.query(
        'SELECT name FROM restaurant_tables WHERE id = $1 AND tenant_id = $2',
        [order.table_id, tenantId]
      );
      tableName = tableRes.rows[0]?.name || null;
    }
    if (order.server_employee_id) {
      const serverRes = await db.query(
        `SELECT first_name, last_name FROM employees WHERE id = $1 AND tenant_id = $2`,
        [order.server_employee_id, tenantId]
      );
      const s = serverRes.rows[0];
      if (s) serverName = [s.first_name, s.last_name].filter(Boolean).join(' ').trim() || null;
    }

    let pickupBranch = null;
    if (order.pickup_branch_id) {
      const branchRes = await db.query(
        `SELECT id, name, address, phone FROM branches WHERE id = $1 AND tenant_id = $2`,
        [order.pickup_branch_id, tenantId]
      );
      pickupBranch = branchRes.rows[0] || null;
    }

    const kitchenService = require('../kitchen/kitchen.service');
    const itemIds = (order.items || []).map((i) => i.id);
    const kitchenStatuses = itemIds.length
      ? await kitchenService.getTicketItemStatuses(tenantId, itemIds)
      : {};
    const itemsWithKitchen = (order.items || []).map((item) => ({
      ...item,
      kitchen_status: kitchenStatuses[item.id] || item.kitchen_status || null,
    }));

    return {
      ...order,
      items: itemsWithKitchen,
      customer,
      shipping_address,
      pickup_branch: pickupBranch,
      created_by_user: createdBy,
      table_name: tableName,
      server_name: serverName,
    };
  }

  async appendItemsToOpenOrder(tenantId, orderId, data, userId) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const orderRes = await client.query(
        'SELECT * FROM orders WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
        [orderId, tenantId]
      );
      const order = orderRes.rows[0];
      if (!order) throw new NotFoundError('Order not found');
      if (!['pending', 'on_hold'].includes(order.status)) {
        throw new ValidationError('Items can only be added to open orders');
      }

      const features = await resolveTenantFeatures(tenantId);
      const branchId = order.branch_id || await branchStockService.getDefaultBranchId(tenantId, client);
      const skipStockCheck = order.status === 'on_hold';
      const allowNegativeStock = isFeatureEnabled(features, 'allow_negative_stock');

      const resolvedItems = await this._resolveLineItems(client, tenantId, data.items, {
        skipStockCheck,
        allowNegativeStock,
        branchId,
        features,
        orderData: { dining_order_type: 'dine_in' },
      });

      const inserted = [];
      for (const item of resolvedItems) {
        const lineTotal = (item.unit_price * item.quantity) - item.discount;
        const itemResult = await client.query(
          `INSERT INTO order_items
             (tenant_id, order_id, product_id, variant_id, product_name, sku, quantity, unit_price, discount, tax, total, serial_numbers, batch_id, metadata, kitchen_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14::jsonb, 'not_sent')
           RETURNING id, product_id, product_name, quantity, unit_price, discount, metadata, kitchen_status`,
          [
            tenantId, orderId, item.product_id, item.variant_id, item.product_name, item.sku,
            item.quantity, item.unit_price, item.discount, item.tax, lineTotal + item.tax,
            JSON.stringify(item.serial_numbers || []), item.batch_id || null,
            JSON.stringify(item.metadata || {}),
          ]
        );
        inserted.push(itemResult.rows[0]);
      }

      const subtotalRes = await client.query(
        `SELECT COALESCE(SUM(unit_price * quantity), 0)::numeric AS subtotal,
                COALESCE(SUM(tax), 0)::numeric AS tax_amount,
                COALESCE(SUM(total), 0)::numeric AS total_amount
         FROM order_items WHERE order_id = $1 AND tenant_id = $2`,
        [orderId, tenantId]
      );
      const totals = subtotalRes.rows[0];
      await client.query(
        `UPDATE orders SET subtotal = $3, tax_amount = $4, total_amount = $5 - discount_amount
         WHERE id = $1 AND tenant_id = $2`,
        [orderId, tenantId, totals.subtotal, totals.tax_amount, totals.total_amount]
      );

      await client.query('COMMIT');
      return { order_id: orderId, items: inserted };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async createPOSOrder(tenantId, data, userId) {
    // Idempotency: if this offline order was already synced, return the existing one
    if (data.client_order_id) {
      const existing = await db.query(
        'SELECT id FROM orders WHERE tenant_id = $1 AND client_order_id = $2',
        [tenantId, data.client_order_id]
      );
      if (existing.rows[0]) return this.getById(tenantId, existing.rows[0].id);
    }

    const status = data.status || 'paid';
    // Enforce monthly transaction quota for completed sales (held orders excluded)
    if (status !== 'on_hold') {
      const { checkTransactionLimit } = require('../../shared/plan-limits');
      await checkTransactionLimit(tenantId);
    }

    const features = await resolveTenantFeatures(tenantId);
    await this._validateRegisterSession(tenantId, features, data);

    const client = await db.getClient();
    const skipStockCheck = status === 'on_hold';
    const allowNegativeStock = isFeatureEnabled(features, 'allow_negative_stock');

    try {
      await client.query('BEGIN');

      await this._validateCustomer(client, tenantId, data.customer_id);
      await this._validateBranch(client, tenantId, data.branch_id);
      const branchId = data.branch_id || await branchStockService.getDefaultBranchId(tenantId, client);
      const restaurantCtx = await this._validateRestaurantContext(client, tenantId, features, data, branchId);

      const voidedLines = (data.items || []).filter((i) => i.voided);
      const activeItems = (data.items || []).filter((i) => !i.voided);
      if (!activeItems.length) throw new ValidationError('Order must have at least one active item');

      await this._validatePosProFeatures(features, { ...data, items: activeItems });

      let resolvedItems = await this._resolveLineItems(client, tenantId, activeItems, {
        skipStockCheck,
        allowNegativeStock,
        branchId,
        features,
        orderData: data,
      });
      const discountAmount = Math.max(0, parseFloat(data.discount_amount) || 0);
      const preSubtotal = resolvedItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
      await this._validateManagerDiscount(tenantId, features, preSubtotal, discountAmount, data);
      await this._validatePriceOverrides(tenantId, features, { ...data, items: activeItems }, resolvedItems);
      let couponDiscount = 0;
      let couponId = null;
      if (data.coupon_code) {
        const couponService = require('../coupons/coupons.service');
        const preSubtotal = resolvedItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
        const applied = await couponService.validateAndApply(tenantId, data.coupon_code, preSubtotal);
        couponDiscount = applied.discount_amount;
        couponId = applied.coupon.id;
      }
      const totalDiscount = discountAmount + couponDiscount;
      resolvedItems = await applyTaxToResolvedItems(tenantId, resolvedItems, totalDiscount, data.customer_id);

      const orderNumber = generateOrderNumber();
      let subtotal = 0;
      let taxAmount = 0;

      const fulfillmentStatus = data.fulfillment_type === 'pickup' ? 'awaiting_pickup' : (data.fulfillment_type ? 'none' : 'none');

      const tipAmount = Math.max(0, parseFloat(data.tip_amount) || 0);

      const { paymentStatus, primaryPaymentMethod } = derivePaymentFields({
        payment_method: data.payment_method,
        payments: data.payments,
        gift_card_code: data.gift_card_code,
        status,
      });

      const voidNote = voidedLines.length
        ? `Voided lines: ${voidedLines.map((v) => `${v.product_name || 'item'} x${v.quantity} (${v.void_reason || 'no reason'})`).join('; ')}`
        : '';
      const orderNotes = [data.notes, voidNote].filter(Boolean).join('\n') || null;

      const orderResult = await client.query(
        `INSERT INTO orders (tenant_id, order_number, customer_id, employee_id, branch_id, order_type, status,
         subtotal, tax_amount, discount_amount, total_amount, payment_method, payment_status, notes, created_by,
         fulfillment_status, pickup_branch_id, tip_amount, payment_intent_id, client_order_id,
         dining_session_id, table_id, guest_count, server_employee_id, kitchen_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, $8, 0, $9, $10, $11, $12, $13, $14, $15, $16, $17,
                 $18, $19, $20, $21, $22) RETURNING *`,
        [
          tenantId, orderNumber, data.customer_id || null, data.employee_id || null, data.branch_id || null,
          data.order_type || 'pos', status, totalDiscount, primaryPaymentMethod,
          paymentStatus, orderNotes, userId,
          data.fulfillment_type === 'pickup' ? fulfillmentStatus : 'none',
          data.pickup_branch_id || null, tipAmount, data.payment_intent_id || null, data.client_order_id || null,
          restaurantCtx?.diningSessionId || null,
          restaurantCtx?.tableId || null,
          restaurantCtx?.guestCount || null,
          restaurantCtx?.serverEmployeeId || null,
          restaurantCtx?.kitchenStatus || null,
        ]
      );
      const order = orderResult.rows[0];
      const insertedOrderItems = [];

      for (const item of resolvedItems) {
        const lineTotal = (item.unit_price * item.quantity) - item.discount;
        subtotal += item.unit_price * item.quantity;
        taxAmount += item.tax;

        const itemKitchenStatus = restaurantCtx ? 'not_sent' : null;
        const itemResult = await client.query(
          `INSERT INTO order_items (tenant_id, order_id, product_id, variant_id, product_name, sku, quantity, unit_price, discount, tax, total, serial_numbers, batch_id, metadata, kitchen_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14::jsonb, $15) RETURNING id`,
          [tenantId, order.id, item.product_id, item.variant_id, item.product_name, item.sku,
            item.quantity, item.unit_price, item.discount, item.tax, lineTotal + item.tax,
            JSON.stringify(item.serial_numbers || []), item.batch_id || null,
            JSON.stringify(item.metadata || {}), itemKitchenStatus]
        );
        const orderItemId = itemResult.rows[0].id;
        insertedOrderItems.push({
          order_item_id: orderItemId,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          metadata: item.metadata || {},
        });
        if (item.serial_numbers?.length) {
          const tracking = require('../products/catalog-tracking.service');
          await tracking.markSerialsSold(tenantId, item.product_id, item.serial_numbers, orderItemId, client);
        }
        if (item.batch_id) {
          const tracking = require('../products/catalog-tracking.service');
          await tracking.consumeBatch(tenantId, item.batch_id, item.quantity, client);
        }

        if (item.product_id && !skipStockCheck) {
          await branchStockService.saleDecrement(
            tenantId, branchId, item.product_id, item.variant_id,
            item.quantity, order.id, userId, allowNegativeStock, client
          );
        }
      }

      let createdKitchenTickets = [];
      if (restaurantCtx?.kitchenStatus && data.send_to_kitchen) {
        const kitchenService = require('../kitchen/kitchen.service');
        createdKitchenTickets = await kitchenService.createTicketsForOrder(client, tenantId, {
          orderId: order.id,
          branchId,
          diningSessionId: restaurantCtx.diningSessionId,
          tableId: restaurantCtx.tableId,
          sendToKitchen: true,
          orderItems: insertedOrderItems,
          features,
        });
      }

      const voidedOrderItemIds = (data.items || [])
        .filter((i) => i.voided && i.order_item_id)
        .map((i) => i.order_item_id);
      if (voidedOrderItemIds.length) {
        const kitchenService = require('../kitchen/kitchen.service');
        await kitchenService.cancelTicketItemsForOrderItems(client, tenantId, voidedOrderItemIds, userId);
      }

      if (discountAmount > subtotal) {
        throw new ValidationError('Discount cannot exceed subtotal');
      }

      const totalAmount = subtotal + taxAmount - totalDiscount + tipAmount;

      let loyaltyPaymentAmount = 0;
      if (data.loyalty_points_to_redeem && data.customer_id && status !== 'on_hold') {
        const loyaltyService = require('../loyalty/loyalty.service');
        const settings = await loyaltyService.getSettings(tenantId);
        const requestedPts = parseInt(data.loyalty_points_to_redeem, 10) || 0;
        if (requestedPts > 0) {
          const rate = settings.redeem_rate > 0 ? settings.redeem_rate : 0.01;
          loyaltyPaymentAmount = Math.min(
            totalAmount,
            Math.round(requestedPts * rate * 100) / 100
          );
          if (loyaltyPaymentAmount > 0) {
            const pointsUsed = Math.ceil(loyaltyPaymentAmount / rate);
            await loyaltyService.redeemPoints(tenantId, data.customer_id, pointsUsed, order.id, client);
            await client.query(
              `INSERT INTO order_payments (tenant_id, order_id, payment_method, amount, reference)
               VALUES ($1, $2, 'loyalty', $3, $4)`,
              [tenantId, order.id, loyaltyPaymentAmount, `${pointsUsed} pts`]
            );
          }
        }
      }
      const amountDue = +(totalAmount - loyaltyPaymentAmount).toFixed(2);

      if (data.payments?.length && status !== 'on_hold') {
        const payTotal = data.payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        if (Math.abs(payTotal - totalAmount) > 0.02) {
          throw new ValidationError('Split payment amounts must equal order total');
        }
      }

      await client.query(
        `UPDATE orders SET subtotal = $1, tax_amount = $2, total_amount = $3, completed_at = CASE WHEN $4 != 'on_hold' THEN NOW() ELSE NULL END,
         held_at = CASE WHEN $4 = 'on_hold' THEN NOW() ELSE held_at END WHERE id = $5 AND tenant_id = $6`,
        [subtotal, taxAmount, totalAmount, status, order.id, tenantId]
      );

      if (data.payments?.length) {
        const giftCardsService = require('../gift-cards/gift-cards.service');
        const loyaltyService = require('../loyalty/loyalty.service');
        for (const p of data.payments) {
          let reference = p.reference || null;
          // Gift card / store credit tender: redeem within the same transaction.
          if (p.method === 'gift_card' && p.code) {
            const redemption = await giftCardsService.redeem(
              tenantId, p.code, parseFloat(p.amount), { orderId: order.id, note: `Order ${orderNumber}` }, client
            );
            reference = `${p.code} (bal ${redemption.balance})`;
          }
          if (p.method === 'loyalty') {
            if (!data.customer_id) throw new ValidationError('Customer required for loyalty redemption');
            const settings = await loyaltyService.getSettings(tenantId);
            const redeemRate = settings.redeem_rate > 0 ? settings.redeem_rate : 0.01;
            const points = Math.ceil(parseFloat(p.amount) / redeemRate);
            await loyaltyService.redeemPoints(tenantId, data.customer_id, points, order.id, client);
            reference = `${points} pts`;
          }
          await client.query(
            `INSERT INTO order_payments (tenant_id, order_id, payment_method, amount, reference) VALUES ($1, $2, $3, $4, $5)`,
            [tenantId, order.id, p.method, p.amount, reference]
          );
        }
      } else if (data.gift_card_code && status !== 'on_hold') {
        const giftCardsService = require('../gift-cards/gift-cards.service');
        const redemption = await giftCardsService.redeem(
          tenantId, data.gift_card_code, amountDue, { orderId: order.id, note: `Order ${orderNumber}` }, client
        );
        await client.query(
          `INSERT INTO order_payments (tenant_id, order_id, payment_method, amount, reference) VALUES ($1, $2, $3, $4, $5)`,
          [tenantId, order.id, 'gift_card', redemption.applied, `${data.gift_card_code} (bal ${redemption.balance})`]
        );
        if (redemption.applied + 0.02 < amountDue && !data.payment_method) {
          throw new ValidationError('Gift card balance is insufficient for this order');
        }
        if (data.payment_method && data.payment_method !== 'gift_card') {
          const remainder = +(amountDue - redemption.applied).toFixed(2);
          if (remainder > 0.02) {
            await client.query(
              `INSERT INTO order_payments (tenant_id, order_id, payment_method, amount) VALUES ($1, $2, $3, $4)`,
              [tenantId, order.id, data.payment_method, remainder]
            );
          }
        }
      } else if (data.payment_method && status !== 'on_hold' && amountDue > 0.02) {
        await client.query(
          `INSERT INTO order_payments (tenant_id, order_id, payment_method, amount) VALUES ($1, $2, $3, $4)`,
          [tenantId, order.id, data.payment_method, amountDue]
        );
      }

      await client.query('COMMIT');

      if (createdKitchenTickets.length) {
        setImmediate(() => {
          try {
            const kitchenService = require('../kitchen/kitchen.service');
            kitchenService.notifyTicketsCreated(tenantId, branchId, createdKitchenTickets).catch(() => {});
          } catch (_) { /* optional */ }
        });
      }

      if (couponId && status !== 'on_hold') {
        setImmediate(() => {
          const couponService = require('../coupons/coupons.service');
          couponService.recordRedemption(tenantId, couponId, order.id, data.customer_id, couponDiscount).catch(() => {});
        });
      }

      if (data.customer_id && ['paid', 'completed'].includes(status)) {
        setImmediate(() => {
          const loyaltyService = require('../loyalty/loyalty.service');
          loyaltyService.earnPoints(tenantId, data.customer_id, order.id, totalAmount).catch(() => {});
        });
      }

      if (status !== 'on_hold') {
        setImmediate(() => {
          const webhookService = require('../webhooks/webhooks.service');
          webhookService.dispatch(tenantId, 'order.created', { id: order.id, order_number: orderNumber, total_amount: totalAmount }).catch(() => {});
          try {
            const { emitToTenant } = require('../../realtime/socket');
            emitToTenant(tenantId, 'order.created', { id: order.id, order_number: orderNumber, total_amount: totalAmount });
          } catch (_) { /* realtime optional */ }
          const accountingService = require('../accounting/accounting.service');
          accountingService.postOrderPaid(tenantId, {
            id: order.id,
            order_number: orderNumber,
            total_amount: totalAmount,
            tax_amount: taxAmount,
          }, userId).catch(() => {});
        });
      }

      return this.getById(tenantId, order.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async holdSale(tenantId, data, userId) {
    return this.createPOSOrder(tenantId, { ...data, status: 'on_hold' }, userId);
  }

  async resumeSale(tenantId, orderId, paymentData, userId) {
    const order = await this.getById(tenantId, orderId);
    if (order.status !== 'on_hold') throw new ValidationError('Order is not on hold');

    const features = await resolveTenantFeatures(tenantId);
    const allowNegativeStock = isFeatureEnabled(features, 'allow_negative_stock');
    const branchId = order.branch_id || await branchStockService.getDefaultBranchId(tenantId);

    await this._resolveLineItems(db, tenantId, order.items.map((i) => ({
      product_id: i.product_id,
      variant_id: i.variant_id,
      quantity: i.quantity,
    })), { allowNegativeStock, branchId, features });

    await this.repo.update(orderId, {
      status: 'paid',
      payment_method: paymentData.payment_method,
      payment_status: 'paid',
      completed_at: new Date(),
    }, tenantId);

    for (const item of order.items) {
      if (item.product_id) {
        await branchStockService.saleDecrement(
          tenantId, branchId, item.product_id, item.variant_id,
          item.quantity, orderId, userId, allowNegativeStock
        );
      }
    }

    await db.query(
      `INSERT INTO order_payments (tenant_id, order_id, payment_method, amount)
       VALUES ($1, $2, $3, $4)`,
      [tenantId, orderId, paymentData.payment_method, order.total_amount]
    );

    return this.getById(tenantId, orderId);
  }

  async restoreHeldSale(tenantId, orderId) {
    const order = await this.getById(tenantId, orderId);
    if (order.status !== 'on_hold') throw new ValidationError('Order is not on hold');

    const cartData = {
      items: order.items.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        product_name: item.product_name,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
      })),
      discount: parseFloat(order.discount_amount) || 0,
      customer_id: order.customer_id,
      branch_id: order.branch_id,
      notes: order.notes,
      customer: order.customer,
    };

    await db.query('DELETE FROM order_items WHERE order_id = $1 AND tenant_id = $2', [orderId, tenantId]);
    await db.query('DELETE FROM orders WHERE id = $1 AND tenant_id = $2', [orderId, tenantId]);

    return cartData;
  }

  async updateStatus(tenantId, id, status) {
    if (status === 'refunded') {
      return this.refundOrder(tenantId, id);
    }
    return this.repo.update(id, { status }, tenantId);
  }

  async refundOrder(tenantId, id, userId = null) {
    const order = await this.getById(tenantId, id);
    if (order.status === 'refunded') throw new ValidationError('Order already refunded');

    const branchId = await branchStockService.resolveBranchId(tenantId, order.branch_id);
    const tracking = require('../products/catalog-tracking.service');

    // Offset qty already restocked via returns so partial return + full refund does not double-restock.
    const prior = await db.query(
      `SELECT ori.order_item_id, COALESCE(SUM(ori.quantity), 0)::int AS returned_qty
       FROM order_return_items ori
       JOIN order_returns r ON r.id = ori.return_id
       WHERE r.order_id = $1 AND r.tenant_id = $2 AND COALESCE(ori.restocked, r.restocked, false) = true
       GROUP BY ori.order_item_id`,
      [id, tenantId]
    );
    const priorMap = Object.fromEntries(prior.rows.map((r) => [r.order_item_id, r.returned_qty]));

    for (const item of order.items) {
      if (!item.product_id) continue;
      const alreadyRestocked = priorMap[item.id] || 0;
      const qtyToRestock = restockQtyAfterReturns(item.quantity, alreadyRestocked);
      if (qtyToRestock > 0) {
        await branchStockService.saleIncrement(
          tenantId, branchId, item.product_id, item.variant_id,
          qtyToRestock, id, userId
        );
      }
      const serials = item.serial_numbers || [];
      if (Array.isArray(serials) && serials.length) {
        await tracking.markSerialsReturned(tenantId, item.product_id, serials);
      }
      if (item.batch_id && qtyToRestock > 0) {
        await tracking.restoreBatch(tenantId, item.batch_id, qtyToRestock);
      }
    }

    return this.repo.update(id, { status: 'refunded', payment_status: 'refunded' }, tenantId);
  }

  async returnOrder(tenantId, orderId, data, userId) {
    const order = await this.getById(tenantId, orderId);
    if (!['paid', 'completed'].includes(order.status)) {
      throw new ValidationError('Only paid or completed orders can be returned');
    }

    const prior = await db.query(
      `SELECT ori.order_item_id, COALESCE(SUM(ori.quantity), 0)::int AS returned_qty
       FROM order_return_items ori
       JOIN order_returns r ON r.id = ori.return_id
       WHERE r.order_id = $1 AND r.tenant_id = $2
       GROUP BY ori.order_item_id`,
      [orderId, tenantId]
    );
    const priorMap = Object.fromEntries(prior.rows.map((r) => [r.order_item_id, r.returned_qty]));

    const restock = data.restock !== false;
    let totalRefund = 0;
    const returnItems = [];
    const tracking = require('../products/catalog-tracking.service');
    const branchId = await branchStockService.resolveBranchId(tenantId, order.branch_id);

    for (const line of data.items) {
      const orderItem = order.items.find((i) => i.id === line.order_item_id);
      if (!orderItem) throw new NotFoundError('Order item not found');
      const qty = parseInt(line.quantity, 10);
      const already = priorMap[orderItem.id] || 0;
      if (qty < 1 || qty > orderItem.quantity - already) {
        throw new ValidationError(
          `Invalid return quantity for ${orderItem.product_name} (already returned ${already})`
        );
      }
      const unitRefund = parseFloat(orderItem.total) / orderItem.quantity;
      const refundAmount = Math.round(unitRefund * qty * 100) / 100;
      totalRefund += refundAmount;
      returnItems.push({
        orderItem,
        qty,
        refundAmount,
        serials: line.serial_numbers || orderItem.serial_numbers || [],
      });
    }

    const features = await resolveTenantFeatures(tenantId);
    await this._validateReturnManagerAuth(tenantId, features, totalRefund, data);

    const client = await db.getClient();
    const returnNumber = `RET-${Date.now().toString(36).toUpperCase()}`;

    try {
      await client.query('BEGIN');

      const retResult = await client.query(
        `INSERT INTO order_returns (tenant_id, order_id, return_number, reason, total_refund, restocked, created_by, payment_refund_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [tenantId, orderId, returnNumber, data.reason || null, totalRefund, restock, userId, data.gateway_refund ? 'requested' : 'manual']
      );
      const returnRecord = retResult.rows[0];

      for (const { orderItem, qty, refundAmount, serials } of returnItems) {
        await client.query(
          `INSERT INTO order_return_items (tenant_id, return_id, order_item_id, quantity, refund_amount, restocked)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [tenantId, returnRecord.id, orderItem.id, qty, refundAmount, restock]
        );

        if (restock && orderItem.product_id) {
          await branchStockService.saleIncrement(
            tenantId, branchId, orderItem.product_id, orderItem.variant_id,
            qty, returnRecord.id, userId, client
          );
          if (serials?.length) {
            await tracking.markSerialsReturned(tenantId, orderItem.product_id, serials, client);
          }
          if (orderItem.batch_id) {
            await tracking.restoreBatch(tenantId, orderItem.batch_id, qty, client);
          }
        }
      }

      // Reverse gift card / loyalty tenders proportionally
      const tenderReversals = [];
      if (totalRefund > 0) {
        const payRes = await client.query(
          'SELECT * FROM order_payments WHERE order_id = $1 AND tenant_id = $2',
          [orderId, tenantId]
        );
        const giftCardsService = require('../gift-cards/gift-cards.service');
        const loyaltyService = require('../loyalty/loyalty.service');
        const allocations = allocateProportionalRefund(totalRefund, payRes.rows);

        for (const row of allocations) {
          const share = row.refundShare || 0;
          if (share <= 0) continue;

          if (row.payment_method === 'gift_card') {
            const code = giftCardsService.parseCodeFromReference(row.reference);
            if (code) {
              const cr = await giftCardsService.credit(
                tenantId, code, share,
                { orderId, returnId: returnRecord.id, note: `Return ${returnNumber}` },
                client
              );
              tenderReversals.push({ method: 'gift_card', code, amount: cr.credited });
            }
          }

          if (row.payment_method === 'loyalty' && order.customer_id) {
            const totalPts = loyaltyService.parsePointsFromReference(row.reference);
            const payAmt = parseFloat(row.amount) || 0;
            if (totalPts > 0 && payAmt > 0) {
              const pts = Math.ceil(totalPts * (share / payAmt));
              if (pts > 0) {
                await loyaltyService.restoreRedeemed(
                  tenantId, order.customer_id, pts, orderId, client
                );
                tenderReversals.push({ method: 'loyalty', points: pts });
              }
            }
          }
        }

        if (order.customer_id) {
          await loyaltyService.clawbackEarned(
            tenantId, order.customer_id, orderId, totalRefund, order.total_amount, client
          );
        }
      }

      const allReturned = order.items.every((item) => {
        const thisReturn = returnItems
          .filter((r) => r.orderItem.id === item.id)
          .reduce((s, r) => s + r.qty, 0);
        const already = priorMap[item.id] || 0;
        return already + thisReturn >= item.quantity;
      });

      if (allReturned) {
        await client.query(
          `UPDATE orders SET status = 'refunded', payment_status = 'refunded' WHERE id = $1 AND tenant_id = $2`,
          [orderId, tenantId]
        );
      }

      // Optional Stripe refund if payment_intent present
      if (data.gateway_refund && order.payment_intent_id) {
        try {
          const paymentsService = require('../payments/payments.service');
          if (typeof paymentsService.refundPaymentIntent === 'function') {
            const gw = await paymentsService.refundPaymentIntent(order.payment_intent_id, totalRefund);
            await client.query(
              `UPDATE order_returns SET gateway_refund_id = $1, payment_refund_status = 'succeeded' WHERE id = $2`,
              [gw?.id || gw?.refund_id || null, returnRecord.id]
            );
          }
        } catch (err) {
          await client.query(
            `UPDATE order_returns SET payment_refund_status = 'failed' WHERE id = $1`,
            [returnRecord.id]
          );
        }
      }

      await client.query('COMMIT');

      setImmediate(() => {
        const accountingService = require('../accounting/accounting.service');
        accountingService.postOrderReturn(tenantId, returnRecord, order, userId).catch(() => {});
      });

      return {
        ...returnRecord,
        tender_reversals: tenderReversals,
        items: returnItems.map((r) => ({
          order_item_id: r.orderItem.id,
          product_name: r.orderItem.product_name,
          quantity: r.qty,
          refund_amount: r.refundAmount,
        })),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new OrderService();
