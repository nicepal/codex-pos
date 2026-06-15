const db = require('../../config/database');

class LoyaltyService {
  async earnPoints(tenantId, customerId, orderId, amount, pointsPerDollar = 1) {
    const points = Math.floor(parseFloat(amount) * pointsPerDollar);
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
}

module.exports = new LoyaltyService();
