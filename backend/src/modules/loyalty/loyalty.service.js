const db = require('../../config/database');

class LoyaltyService {
  async getSettings(tenantId) {
    const result = await db.query(
      `SELECT value FROM settings WHERE tenant_id = $1 AND key = 'loyalty'`,
      [tenantId]
    );
    let val = result.rows[0]?.value;
    if (typeof val === 'string') {
      try { val = JSON.parse(val); } catch { val = {}; }
    }
    return {
      points_per_dollar: parseFloat(val?.points_per_dollar) || 1,
      redeem_rate: parseFloat(val?.redeem_rate) || 0.01,
    };
  }

  async earnPoints(tenantId, customerId, orderId, amount) {
    const settings = await this.getSettings(tenantId);
    const points = Math.floor(parseFloat(amount) * settings.points_per_dollar);
    if (points <= 0) return null;

    await db.query('UPDATE customers SET loyalty_points = loyalty_points + $1 WHERE id = $2 AND tenant_id = $3', [points, customerId, tenantId]);
    const tx = await db.query(
      `INSERT INTO loyalty_transactions (tenant_id, customer_id, order_id, points, transaction_type) VALUES ($1, $2, $3, $4, 'earn') RETURNING *`,
      [tenantId, customerId, orderId, points]
    );
    return tx.rows[0];
  }

  async redeemPoints(tenantId, customerId, points, orderId = null) {
    const customer = await db.query('SELECT loyalty_points FROM customers WHERE id = $1 AND tenant_id = $2', [customerId, tenantId]);
    if (!customer.rows[0] || customer.rows[0].loyalty_points < points) {
      const { ValidationError } = require('../../shared/errors');
      throw new ValidationError('Insufficient loyalty points');
    }
    await db.query('UPDATE customers SET loyalty_points = loyalty_points - $1 WHERE id = $2 AND tenant_id = $3', [points, customerId, tenantId]);
    return db.query(
      `INSERT INTO loyalty_transactions (tenant_id, customer_id, order_id, points, transaction_type) VALUES ($1, $2, $3, $4, 'redeem') RETURNING *`,
      [tenantId, customerId, orderId, -points]
    ).then((r) => r.rows[0]);
  }

  async getHistory(tenantId, customerId) {
    const result = await db.query(
      `SELECT * FROM loyalty_transactions WHERE tenant_id = $1 AND customer_id = $2 ORDER BY created_at DESC`,
      [tenantId, customerId]
    );
    return result.rows;
  }

  /** Restore redeemed points on proportional return/refund. */
  async restoreRedeemed(tenantId, customerId, points, orderId = null, client = null) {
    const pts = Math.max(0, parseInt(points, 10) || 0);
    if (!pts || !customerId) return null;
    const runner = client || db;
    await runner.query(
      'UPDATE customers SET loyalty_points = loyalty_points + $1 WHERE id = $2 AND tenant_id = $3',
      [pts, customerId, tenantId]
    );
    const tx = await runner.query(
      `INSERT INTO loyalty_transactions (tenant_id, customer_id, order_id, points, transaction_type)
       VALUES ($1, $2, $3, $4, 'restore') RETURNING *`,
      [tenantId, customerId, orderId, pts]
    );
    return tx.rows[0];
  }

  /** Claw back earned points proportional to refund amount. */
  async clawbackEarned(tenantId, customerId, orderId, refundAmount, orderTotal, client = null) {
    if (!customerId || !orderId) return null;
    const runner = client || db;
    const earn = await runner.query(
      `SELECT points FROM loyalty_transactions
       WHERE tenant_id = $1 AND customer_id = $2 AND order_id = $3 AND transaction_type = 'earn'
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId, customerId, orderId]
    );
    const earned = earn.rows[0]?.points || 0;
    if (!earned) return null;

    const total = parseFloat(orderTotal) || 0;
    const refund = parseFloat(refundAmount) || 0;
    if (!total || refund <= 0) return null;

    const claw = Math.min(earned, Math.floor(earned * (refund / total)));
    if (claw <= 0) return null;

    const cust = await runner.query(
      'SELECT loyalty_points FROM customers WHERE id = $1 AND tenant_id = $2',
      [customerId, tenantId]
    );
    const current = cust.rows[0]?.loyalty_points || 0;
    const deduct = Math.min(claw, current);

    if (deduct > 0) {
      await runner.query(
        'UPDATE customers SET loyalty_points = loyalty_points - $1 WHERE id = $2 AND tenant_id = $3',
        [deduct, customerId, tenantId]
      );
      const tx = await runner.query(
        `INSERT INTO loyalty_transactions (tenant_id, customer_id, order_id, points, transaction_type)
         VALUES ($1, $2, $3, $4, 'clawback') RETURNING *`,
        [tenantId, customerId, orderId, -deduct]
      );
      return tx.rows[0];
    }
    return null;
  }

  /** Parse points from loyalty payment reference (e.g. "120 pts"). */
  parsePointsFromReference(reference) {
    if (!reference) return 0;
    const m = String(reference).match(/(\d+)\s*pts/i);
    return m ? parseInt(m[1], 10) : 0;
  }
}

module.exports = new LoyaltyService();
