const db = require('../../config/database');
const BaseRepository = require('../../shared/base.repository');
const { NotFoundError } = require('../../shared/errors');
const crypto = require('crypto');
const logger = require('../../utils/logger');

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
      await this._deliver(hook, event, payload, 1);
    }
  }

  async _deliver(hook, event, payload, attempt) {
    try {
      const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
      const sig = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': sig },
        body,
      });
      const ok = res.status >= 200 && res.status < 300;
      await db.query(
        `INSERT INTO webhook_deliveries
           (webhook_id, event, payload, response_status, attempts, next_retry_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          hook.id,
          event,
          payload,
          res.status,
          attempt,
          ok ? null : new Date(Date.now() + this._backoffMs(attempt)),
        ]
      );
      return ok;
    } catch (err) {
      await db.query(
        `INSERT INTO webhook_deliveries
           (webhook_id, event, payload, response_status, attempts, next_retry_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [hook.id, event, payload, 0, attempt, new Date(Date.now() + this._backoffMs(attempt))]
      );
      return false;
    }
  }

  _backoffMs(attempt) {
    return Math.min(60 * 60 * 1000, (2 ** Math.max(0, attempt - 1)) * 60 * 1000);
  }

  /**
   * Retries failed webhook deliveries whose next_retry_at has passed.
   * Caps at 5 attempts per delivery row.
   */
  async retryFailedDeliveries({ limit = 50 } = {}) {
    const pending = await db.query(
      `SELECT wd.*, w.url, w.secret, w.tenant_id, w.status AS webhook_status
       FROM webhook_deliveries wd
       JOIN webhooks w ON w.id = wd.webhook_id
       WHERE wd.next_retry_at IS NOT NULL
         AND wd.next_retry_at <= NOW()
         AND wd.attempts < 5
         AND (wd.response_status IS NULL OR wd.response_status < 200 OR wd.response_status >= 300)
         AND w.status = 'active'
       ORDER BY wd.next_retry_at ASC
       LIMIT $1`,
      [limit]
    );

    let retried = 0;
    let succeeded = 0;
    for (const row of pending.rows) {
      retried += 1;
      const attempt = (row.attempts || 1) + 1;
      try {
        const body = JSON.stringify({
          event: row.event,
          data: row.payload,
          timestamp: new Date().toISOString(),
          retry: true,
        });
        const sig = crypto.createHmac('sha256', row.secret).update(body).digest('hex');
        const res = await fetch(row.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': sig },
          body,
        });
        const ok = res.status >= 200 && res.status < 300;
        await db.query(
          `UPDATE webhook_deliveries
           SET response_status = $2, attempts = $3,
               next_retry_at = $4, delivered_at = NOW()
           WHERE id = $1`,
          [
            row.id,
            res.status,
            attempt,
            ok ? null : new Date(Date.now() + this._backoffMs(attempt)),
          ]
        );
        if (ok) succeeded += 1;
      } catch (err) {
        await db.query(
          `UPDATE webhook_deliveries
           SET response_status = 0, attempts = $2,
               next_retry_at = $3, delivered_at = NOW()
           WHERE id = $1`,
          [row.id, attempt, new Date(Date.now() + this._backoffMs(attempt))]
        );
        logger.warn('Webhook retry failed', { deliveryId: row.id, error: err.message });
      }
    }
    return { retried, succeeded };
  }
}

module.exports = new WebhookService();
