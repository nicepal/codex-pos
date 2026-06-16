const db = require('../../config/database');
const BaseRepository = require('../../shared/base.repository');
const { NotFoundError } = require('../../shared/errors');
const crypto = require('crypto');

class WebhookRepository extends BaseRepository {
  constructor() { super('webhooks'); }
}

class WebhookService {
  constructor() { this.repo = new WebhookRepository(); }

  async list(tenantId) {
    const result = await this.repo.findAll(tenantId, { limit: 100 });
    return result.rows;
  }

  async create(tenantId, data) {
    const secret = crypto.randomBytes(24).toString('hex');
    return this.repo.create({
      url: data.url,
      events: data.events || ['order.created'],
      secret,
      status: 'active',
    }, tenantId);
  }

  async remove(tenantId, id) {
    return this.repo.delete(id, tenantId);
  }

  async dispatch(tenantId, event, payload) {
    const hooks = await db.query(
      `SELECT * FROM webhooks WHERE tenant_id = $1 AND status = 'active' AND $2 = ANY(events)`,
      [tenantId, event]
    );
    for (const hook of hooks.rows) {
      try {
        const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
        const sig = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');
        const res = await fetch(hook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': sig },
          body,
        });
        await db.query(
          `INSERT INTO webhook_deliveries (webhook_id, event, payload, response_status) VALUES ($1, $2, $3, $4)`,
          [hook.id, event, payload, res.status]
        );
      } catch (err) {
        await db.query(
          `INSERT INTO webhook_deliveries (webhook_id, event, payload, response_status) VALUES ($1, $2, $3, $4)`,
          [hook.id, event, payload, 0]
        );
      }
    }
  }
}

module.exports = new WebhookService();
