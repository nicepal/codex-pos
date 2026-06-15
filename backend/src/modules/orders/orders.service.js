const db = require('../../config/database');
const BaseRepository = require('../../shared/base.repository');
const { generateOrderNumber } = require('../../utils/helpers');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const inventoryService = require('../inventory/inventory.service');

class OrderRepository extends BaseRepository {
  constructor() {
    super('orders');
  }

  async findWithItems(tenantId, id) {
    const order = await this.findById(id, tenantId);
    if (!order) return null;
    const items = await db.query(
      'SELECT * FROM order_items WHERE order_id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    return { ...order, items: items.rows };
  }
}

class OrderService {
  constructor() {
    this.repo = new OrderRepository();
  }

  async _resolveLineItems(client, tenantId, items, { skipStockCheck = false } = {}) {
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

      if (variantId) {
        const result = await client.query(
          `SELECT pv.*, p.name AS parent_name, p.id AS parent_product_id
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
        stockQty = row.stock_quantity;
      } else if (productId) {
        const result = await client.query(
          `SELECT * FROM products WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
          [productId, tenantId]
        );
        const row = result.rows[0];
        if (!row) throw new NotFoundError('Product not found or inactive');
        unitPrice = parseFloat(row.sale_price);
        productName = row.name;
        sku = row.sku;
        stockQty = row.stock_quantity;
      } else {
        throw new ValidationError('Each item must have product_id or variant_id');
      }

      if (!skipStockCheck && stockQty < qty) {
        throw new ValidationError(`Insufficient stock for ${productName}`);
      }

      resolved.push({
        product_id: productId,
        variant_id: variantId,
        product_name: productName,
        sku,
        quantity: qty,
        unit_price: unitPrice,
        discount: parseFloat(item.discount) || 0,
        tax: parseFloat(item.tax) || 0,
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

  async list(tenantId, query) {
    const filters = { status: query.status, order_type: query.order_type };
    if (query.branch_id) filters.branch_id = query.branch_id;
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

    return {
      business: tenant.rows[0],
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
        'SELECT id, name, email, phone FROM customers WHERE id = $1 AND tenant_id = $2',
        [order.customer_id, tenantId]
      );
      customer = result.rows[0] || null;
    }

    let createdBy = null;
    if (order.created_by) {
      const result = await db.query('SELECT id, first_name, last_name, email FROM users WHERE id = $1', [order.created_by]);
      createdBy = result.rows[0] || null;
    }

    return { ...order, customer, created_by_user: createdBy };
  }

  async createPOSOrder(tenantId, data, userId) {
    const client = await db.getClient();
    const status = data.status || 'paid';
    const skipStockCheck = status === 'on_hold';

    try {
      await client.query('BEGIN');

      await this._validateCustomer(client, tenantId, data.customer_id);
      await this._validateBranch(client, tenantId, data.branch_id);

      const resolvedItems = await this._resolveLineItems(client, tenantId, data.items, { skipStockCheck });

      const orderNumber = generateOrderNumber();
      let subtotal = 0;
      let taxAmount = 0;
      const discountAmount = Math.max(0, parseFloat(data.discount_amount) || 0);

      const orderResult = await client.query(
        `INSERT INTO orders (tenant_id, order_number, customer_id, employee_id, branch_id, order_type, status,
         subtotal, tax_amount, discount_amount, total_amount, payment_method, payment_status, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, $8, 0, $9, $10, $11, $12) RETURNING *`,
        [
          tenantId, orderNumber, data.customer_id || null, data.employee_id || null, data.branch_id || null,
          data.order_type || 'pos', status, discountAmount, data.payment_method || null,
          data.payment_method && status !== 'on_hold' ? 'paid' : 'pending', data.notes || null, userId,
        ]
      );
      const order = orderResult.rows[0];

      for (const item of resolvedItems) {
        const lineTotal = (item.unit_price * item.quantity) - item.discount;
        subtotal += item.unit_price * item.quantity;
        taxAmount += item.tax;

        await client.query(
          `INSERT INTO order_items (tenant_id, order_id, product_id, variant_id, product_name, sku, quantity, unit_price, discount, tax, total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [tenantId, order.id, item.product_id, item.variant_id, item.product_name, item.sku,
            item.quantity, item.unit_price, item.discount, item.tax, lineTotal + item.tax]
        );

        if (item.product_id && !skipStockCheck) {
          const stockField = item.variant_id ? 'product_variants' : 'products';
          const stockId = item.variant_id || item.product_id;
          const stockResult = await client.query(
            `UPDATE ${stockField} SET stock_quantity = stock_quantity - $1
             WHERE id = $2 AND tenant_id = $3 AND stock_quantity >= $1
             RETURNING id`,
            [item.quantity, stockId, tenantId]
          );
          if (!stockResult.rows[0]) {
            throw new ValidationError(`Insufficient stock for ${item.product_name}`);
          }

          await client.query(
            `INSERT INTO inventory_transactions (tenant_id, product_id, variant_id, transaction_type, quantity, reference_type, reference_id, created_by)
             VALUES ($1, $2, $3, 'sale', $4, 'order', $5, $6)`,
            [tenantId, item.product_id, item.variant_id, -item.quantity, order.id, userId]
          );
        }
      }

      if (discountAmount > subtotal) {
        throw new ValidationError('Discount cannot exceed subtotal');
      }

      const totalAmount = subtotal + taxAmount - discountAmount;

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
        for (const p of data.payments) {
          await client.query(
            `INSERT INTO order_payments (tenant_id, order_id, payment_method, amount, reference) VALUES ($1, $2, $3, $4, $5)`,
            [tenantId, order.id, p.method, p.amount, p.reference || null]
          );
        }
      } else if (data.payment_method && status !== 'on_hold') {
        await client.query(
          `INSERT INTO order_payments (tenant_id, order_id, payment_method, amount) VALUES ($1, $2, $3, $4)`,
          [tenantId, order.id, data.payment_method, totalAmount]
        );
      }

      await client.query('COMMIT');

      if (data.customer_id && ['paid', 'completed'].includes(status)) {
        setImmediate(() => {
          const loyaltyService = require('../loyalty/loyalty.service');
          loyaltyService.earnPoints(tenantId, data.customer_id, order.id, totalAmount).catch(() => {});
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

    await this._resolveLineItems(db, tenantId, order.items.map((i) => ({
      product_id: i.product_id,
      variant_id: i.variant_id,
      quantity: i.quantity,
    })));

    await this.repo.update(orderId, {
      status: 'paid',
      payment_method: paymentData.payment_method,
      payment_status: 'paid',
      completed_at: new Date(),
    }, tenantId);

    for (const item of order.items) {
      if (item.product_id) {
        const stockField = item.variant_id ? 'product_variants' : 'products';
        const stockId = item.variant_id || item.product_id;
        const stockResult = await db.query(
          `UPDATE ${stockField} SET stock_quantity = stock_quantity - $1
           WHERE id = $2 AND tenant_id = $3 AND stock_quantity >= $1 RETURNING id`,
          [item.quantity, stockId, tenantId]
        );
        if (!stockResult.rows[0]) {
          throw new ValidationError(`Insufficient stock for ${item.product_name}`);
        }
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

    for (const item of order.items) {
      if (!item.product_id) continue;
      await inventoryService.stockIn(tenantId, {
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        notes: `Refund for order ${order.order_number}`,
      }, userId);
    }

    return this.repo.update(id, { status: 'refunded', payment_status: 'refunded' }, tenantId);
  }
}

module.exports = new OrderService();
