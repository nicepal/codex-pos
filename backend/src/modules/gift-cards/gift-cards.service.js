const crypto = require('crypto');
const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');

function generateCode() {
  // Human-friendly, unambiguous code: GC-XXXX-XXXX-XXXX
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const block = () => Array.from({ length: 4 }, () =>
    alphabet[crypto.randomInt(0, alphabet.length)]).join('');
  return `GC-${block()}-${block()}-${block()}`;
}

class GiftCardsService {
  async list(tenantId, query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const params = [tenantId];
    let where = 'WHERE gc.tenant_id = $1';
    if (query.status) { params.push(query.status); where += ` AND gc.status = $${params.length}`; }
    if (query.search) { params.push(`%${query.search}%`); where += ` AND gc.code ILIKE $${params.length}`; }

    const count = await db.query(`SELECT COUNT(*)::int AS total FROM gift_cards gc ${where}`, params);
    const rows = await db.query(
      `SELECT gc.*, c.name AS customer_name
       FROM gift_cards gc
       LEFT JOIN customers c ON c.id = gc.customer_id
       ${where} ORDER BY gc.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    const total = count.rows[0].total;
    return { rows: rows.rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getByCode(tenantId, code) {
    const result = await db.query(
      `SELECT * FROM gift_cards WHERE tenant_id = $1 AND code = $2`,
      [tenantId, (code || '').trim().toUpperCase()]
    );
    if (!result.rows[0]) throw new NotFoundError('Gift card not found');
    return result.rows[0];
  }

  async checkBalance(tenantId, code) {
    const card = await this.getByCode(tenantId, code);
    const expired = card.expires_at && new Date(card.expires_at) < new Date();
    return {
      code: card.code,
      balance: parseFloat(card.balance),
      currency: card.currency,
      status: expired ? 'expired' : card.status,
      redeemable: card.status === 'active' && !expired && parseFloat(card.balance) > 0,
    };
  }

  async issue(tenantId, data, userId) {
    const amount = parseFloat(data.amount);
    if (!amount || amount <= 0) throw new ValidationError('Amount must be greater than zero');

    let code = (data.code || '').trim().toUpperCase();
    if (code) {
      const existing = await db.query('SELECT id FROM gift_cards WHERE tenant_id = $1 AND code = $2', [tenantId, code]);
      if (existing.rows[0]) throw new ValidationError('Gift card code already exists');
    } else {
      // Retry a few times in the unlikely event of a collision
      for (let i = 0; i < 5; i += 1) {
        const candidate = generateCode();
        const existing = await db.query('SELECT id FROM gift_cards WHERE tenant_id = $1 AND code = $2', [tenantId, candidate]);
        if (!existing.rows[0]) { code = candidate; break; }
      }
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const card = await client.query(
        `INSERT INTO gift_cards (tenant_id, code, initial_balance, balance, currency, customer_id, status, expires_at, created_by)
         VALUES ($1, $2, $3, $3, $4, $5, 'active', $6, $7) RETURNING *`,
        [tenantId, code, amount, (data.currency || 'USD').toUpperCase(), data.customer_id || null, data.expires_at || null, userId || null]
      );
      await client.query(
        `INSERT INTO gift_card_transactions (tenant_id, gift_card_id, type, amount, balance_after, note)
         VALUES ($1, $2, 'issue', $3, $3, $4)`,
        [tenantId, card.rows[0].id, amount, 'Initial issue']
      );
      await client.query('COMMIT');
      return card.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Redeems up to `amount` from a gift card. Returns the amount actually applied
   * (capped at the available balance) so the caller can split tender.
   */
  async redeem(tenantId, code, amount, options = {}, client = null) {
    const runner = client || db;
    const normalizedCode = (code || '').trim().toUpperCase();
    const cardRes = await runner.query(
      `SELECT * FROM gift_cards WHERE tenant_id = $1 AND code = $2 ${client ? 'FOR UPDATE' : ''}`,
      [tenantId, normalizedCode]
    );
    const card = cardRes.rows[0];
    if (!card) throw new NotFoundError('Gift card not found');
    if (card.status !== 'active') throw new ValidationError('Gift card is not active');
    if (card.expires_at && new Date(card.expires_at) < new Date()) throw new ValidationError('Gift card has expired');

    const balance = parseFloat(card.balance);
    if (balance <= 0) throw new ValidationError('Gift card has no balance');

    const applied = Math.min(parseFloat(amount), balance);
    const newBalance = +(balance - applied).toFixed(2);

    await runner.query(
      `UPDATE gift_cards SET balance = $1, status = $2, updated_at = NOW() WHERE id = $3`,
      [newBalance, newBalance === 0 ? 'redeemed' : 'active', card.id]
    );
    await runner.query(
      `INSERT INTO gift_card_transactions (tenant_id, gift_card_id, type, amount, balance_after, order_id, note)
       VALUES ($1, $2, 'redeem', $3, $4, $5, $6)`,
      [tenantId, card.id, applied, newBalance, options.orderId || null, options.note || null]
    );
    return { applied, balance: newBalance, gift_card_id: card.id };
  }

  async transactions(tenantId, giftCardId) {
    const result = await db.query(
      `SELECT * FROM gift_card_transactions WHERE tenant_id = $1 AND gift_card_id = $2 ORDER BY created_at DESC`,
      [tenantId, giftCardId]
    );
    return result.rows;
  }

  async deactivate(tenantId, id) {
    const result = await db.query(
      `UPDATE gift_cards SET status = 'disabled', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Gift card not found');
    return result.rows[0];
  }
}

module.exports = new GiftCardsService();
