const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

class BranchStockService {
  async getDefaultBranchId(tenantId, client = db) {
    const result = await client.query(
      `SELECT id FROM branches WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [tenantId]
    );
    if (!result.rows[0]) throw new ValidationError('No branch configured for this business');
    return result.rows[0].id;
  }

  async resolveBranchId(tenantId, branchId, client = db) {
    if (branchId) {
      const check = await client.query(
        'SELECT id FROM branches WHERE id = $1 AND tenant_id = $2',
        [branchId, tenantId]
      );
      if (!check.rows[0]) throw new NotFoundError('Branch not found');
      return branchId;
    }
    return this.getDefaultBranchId(tenantId, client);
  }

  async getQuantity(tenantId, branchId, productId, variantId = null, client = db) {
    const bid = await this.resolveBranchId(tenantId, branchId, client);
    const result = await client.query(
      `SELECT quantity FROM branch_stock
       WHERE tenant_id = $1 AND branch_id = $2 AND product_id = $3
         AND COALESCE(variant_id, $4::uuid) = COALESCE($5::uuid, $4::uuid)`,
      [tenantId, bid, productId, NIL_UUID, variantId]
    );
    return result.rows[0]?.quantity ?? 0;
  }

  async ensureRow(tenantId, branchId, productId, variantId, client) {
    const bid = await this.resolveBranchId(tenantId, branchId, client);
    const existing = await client.query(
      `SELECT id FROM branch_stock
       WHERE tenant_id = $1 AND branch_id = $2 AND product_id = $3
         AND COALESCE(variant_id, $4::uuid) = COALESCE($5::uuid, $4::uuid)`,
      [tenantId, bid, productId, NIL_UUID, variantId]
    );
    if (!existing.rows[0]) {
      await client.query(
        `INSERT INTO branch_stock (tenant_id, branch_id, product_id, variant_id, quantity)
         VALUES ($1, $2, $3, $4, 0)`,
        [tenantId, bid, productId, variantId || null]
      );
    }
    return bid;
  }

  async _syncAggregate(tenantId, productId, variantId, client) {
    const sum = await client.query(
      `SELECT COALESCE(SUM(quantity), 0)::int AS total FROM branch_stock
       WHERE tenant_id = $1 AND product_id = $2
         AND COALESCE(variant_id, $3::uuid) = COALESCE($4::uuid, $3::uuid)`,
      [tenantId, productId, NIL_UUID, variantId]
    );
    const total = sum.rows[0].total;
    if (variantId) {
      await client.query(
        'UPDATE product_variants SET stock_quantity = $1 WHERE id = $2 AND tenant_id = $3',
        [total, variantId, tenantId]
      );
    } else {
      await client.query(
        'UPDATE products SET stock_quantity = $1 WHERE id = $2 AND tenant_id = $3',
        [total, productId, tenantId]
      );
    }
    return total;
  }

  async _recordTransaction(client, tenantId, data, type, userId) {
    const prevQty = await this.getQuantity(tenantId, data.branch_id, data.product_id, data.variant_id, client);
    const delta = type === 'stock_out' || type === 'sale' || type === 'transfer'
      ? -Math.abs(data.quantity)
      : Math.abs(data.quantity);
    const newQty = prevQty + delta;
    await client.query(
      `INSERT INTO inventory_transactions
       (tenant_id, product_id, variant_id, branch_id, transaction_type, quantity, previous_quantity, new_quantity, reference_type, reference_id, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        tenantId, data.product_id, data.variant_id || null, data.branch_id || null,
        type, Math.abs(data.quantity), prevQty, newQty,
        data.reference_type || null, data.reference_id || null, data.notes || null, userId,
      ]
    );
  }

  async adjust(tenantId, data, type, userId, client = null) {
    const useClient = client || await db.getClient();
    const ownTx = !client;
    try {
      if (ownTx) await useClient.query('BEGIN');
      const branchId = await this.ensureRow(tenantId, data.branch_id, data.product_id, data.variant_id, useClient);
      const qty = parseInt(data.quantity, 10);
      if (!qty || qty < 1) throw new ValidationError('Invalid quantity');

      if (type === 'stock_out' || type === 'sale') {
        const dec = await useClient.query(
          `UPDATE branch_stock SET quantity = quantity - $1, updated_at = NOW()
           WHERE tenant_id = $2 AND branch_id = $3 AND product_id = $4
             AND COALESCE(variant_id, $5::uuid) = COALESCE($6::uuid, $5::uuid)
             AND quantity >= $1
           RETURNING quantity`,
          [qty, tenantId, branchId, data.product_id, NIL_UUID, data.variant_id]
        );
        if (!dec.rows[0] && !data.allowNegative) {
          throw new ValidationError('Insufficient branch stock');
        }
        if (!dec.rows[0] && data.allowNegative) {
          await useClient.query(
            `UPDATE branch_stock SET quantity = quantity - $1, updated_at = NOW()
             WHERE tenant_id = $2 AND branch_id = $3 AND product_id = $4
               AND COALESCE(variant_id, $5::uuid) = COALESCE($6::uuid, $5::uuid)`,
            [qty, tenantId, branchId, data.product_id, NIL_UUID, data.variant_id]
          );
        }
      } else {
        await useClient.query(
          `UPDATE branch_stock SET quantity = quantity + $1, updated_at = NOW()
           WHERE tenant_id = $2 AND branch_id = $3 AND product_id = $4
             AND COALESCE(variant_id, $5::uuid) = COALESCE($6::uuid, $5::uuid)`,
          [qty, tenantId, branchId, data.product_id, NIL_UUID, data.variant_id]
        );
      }

      await this._syncAggregate(tenantId, data.product_id, data.variant_id, useClient);
      await this._recordTransaction(useClient, tenantId, { ...data, branch_id: branchId }, type, userId);
      if (ownTx) await useClient.query('COMMIT');
      return { branch_id: branchId, quantity: qty };
    } catch (err) {
      if (ownTx) await useClient.query('ROLLBACK');
      throw err;
    } finally {
      if (ownTx) useClient.release();
    }
  }

  async transfer(tenantId, fromBranchId, toBranchId, items, userId, referenceId, notes) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      for (const item of items) {
        await this.adjust(tenantId, {
          branch_id: fromBranchId,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          reference_type: 'transfer',
          reference_id: referenceId,
          notes: notes || `Transfer out`,
        }, 'transfer', userId, client);

        await this.adjust(tenantId, {
          branch_id: toBranchId,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          reference_type: 'transfer',
          reference_id: referenceId,
          notes: notes || `Transfer in`,
        }, 'stock_in', userId, client);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async saleDecrement(tenantId, branchId, productId, variantId, quantity, orderId, userId, allowNegative, client) {
    return this.adjust(tenantId, {
      branch_id: branchId,
      product_id: productId,
      variant_id: variantId,
      quantity,
      allowNegative,
      reference_type: 'order',
      reference_id: orderId,
      notes: 'Sale',
    }, 'sale', userId, client);
  }

  async saleIncrement(tenantId, branchId, productId, variantId, quantity, referenceId, userId, client) {
    return this.adjust(tenantId, {
      branch_id: branchId,
      product_id: productId,
      variant_id: variantId,
      quantity,
      reference_type: 'return',
      reference_id: referenceId,
      notes: 'Return restock',
    }, 'return', userId, client);
  }
}

module.exports = new BranchStockService();
