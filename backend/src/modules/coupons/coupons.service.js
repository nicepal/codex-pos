const db = require('../../config/database');
const BaseRepository = require('../../shared/base.repository');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const { pickAllowedFields } = require('../../shared/sanitize');

const WRITABLE = ['code', 'discount_type', 'discount_value', 'min_order_amount', 'max_uses', 'starts_at', 'expires_at', 'status'];

class CouponRepository extends BaseRepository {
  constructor() { super('tenant_coupons'); }
}

class CouponService {
  constructor() { this.repo = new CouponRepository(); }

  async list(tenantId, query) {
    return this.repo.findAll(tenantId, { page: query.page, limit: query.limit });
  }

  async getById(tenantId, id) {
    const row = await this.repo.findById(id, tenantId);
    if (!row) throw new NotFoundError('Coupon not found');
    return row;
  }

  async create(tenantId, data) {
    const payload = pickAllowedFields(data, WRITABLE);
    payload.code = (payload.code || '').toUpperCase().trim();
    if (!payload.code) throw new ValidationError('Coupon code is required');
    return this.repo.create(payload, tenantId);
  }

  async update(tenantId, id, data) {
    const payload = pickAllowedFields(data, WRITABLE);
    if (payload.code) payload.code = payload.code.toUpperCase().trim();
    return this.repo.update(id, payload, tenantId);
  }

  async remove(tenantId, id) {
    return this.repo.delete(id, tenantId);
  }

  async validateAndApply(tenantId, code, orderSubtotal) {
    const result = await db.query(
      `SELECT * FROM tenant_coupons WHERE tenant_id = $1 AND UPPER(code) = UPPER($2) AND status = 'active'`,
      [tenantId, code]
    );
    const coupon = result.rows[0];
    if (!coupon) throw new ValidationError('Invalid coupon code');

    const now = new Date();
    if (coupon.starts_at && new Date(coupon.starts_at) > now) throw new ValidationError('Coupon not yet active');
    if (coupon.expires_at && new Date(coupon.expires_at) < now) throw new ValidationError('Coupon expired');
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) throw new ValidationError('Coupon usage limit reached');

    const minOrder = parseFloat(coupon.min_order_amount) || 0;
    if (orderSubtotal < minOrder) throw new ValidationError(`Minimum order amount is ${minOrder}`);

    let discount = 0;
    if (coupon.discount_type === 'percent') {
      discount = Math.round(orderSubtotal * (parseFloat(coupon.discount_value) / 100) * 100) / 100;
    } else {
      discount = Math.min(parseFloat(coupon.discount_value), orderSubtotal);
    }

    return { coupon, discount_amount: discount };
  }

  async recordRedemption(tenantId, couponId, orderId, customerId, discountAmount) {
    await db.query(
      `INSERT INTO coupon_redemptions (tenant_id, coupon_id, order_id, customer_id, discount_amount) VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, couponId, orderId, customerId, discountAmount]
    );
    await db.query(
      `UPDATE tenant_coupons SET used_count = used_count + 1 WHERE id = $1 AND tenant_id = $2`,
      [couponId, tenantId]
    );
  }
}

module.exports = new CouponService();
