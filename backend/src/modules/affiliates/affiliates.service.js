const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

class AffiliateService {
  async list() {
    const result = await db.query(
      `SELECT a.*, u.email, u.first_name, u.last_name FROM affiliates a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC`
    );
    return result.rows;
  }

  async create(userId, commissionRate = 10) {
    const code = `REF-${uuidv4().slice(0, 8).toUpperCase()}`;
    const result = await db.query(
      `INSERT INTO affiliates (user_id, referral_code, commission_rate) VALUES ($1, $2, $3) RETURNING *`,
      [userId, code, commissionRate]
    );
    return result.rows[0];
  }

  async getCommissions(affiliateId) {
    const result = await db.query(
      `SELECT ac.*, t.name AS tenant_name FROM affiliate_commissions ac LEFT JOIN tenants t ON t.id = ac.referred_tenant_id WHERE ac.affiliate_id = $1 ORDER BY ac.created_at DESC`,
      [affiliateId]
    );
    return result.rows;
  }

  async approveCommission(commissionId) {
    const result = await db.query(`UPDATE affiliate_commissions SET status = 'approved' WHERE id = $1 RETURNING *`, [commissionId]);
    return result.rows[0];
  }

  async payCommission(commissionId) {
    const result = await db.query(
      `UPDATE affiliate_commissions SET status = 'paid', paid_at = NOW() WHERE id = $1 AND status = 'approved' RETURNING *`,
      [commissionId]
    );
    if (!result.rows[0]) {
      const { ValidationError } = require('../../shared/errors');
      throw new ValidationError('Commission must be approved before payout');
    }
    return result.rows[0];
  }
}

module.exports = new AffiliateService();
