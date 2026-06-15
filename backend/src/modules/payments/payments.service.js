const db = require('../../config/database');
const config = require('../../config');
const { NotFoundError, ValidationError, ForbiddenError } = require('../../shared/errors');
const subscriptionService = require('../platform/platform.services').subscriptions.service;

class PaymentsService {
  async createCheckoutSession(tenantId, planId, billingCycle = 'monthly') {
    const plan = await db.query('SELECT * FROM plans WHERE id = $1', [planId]);
    if (!plan.rows[0]) throw new NotFoundError('Plan not found');

    const amount = billingCycle === 'annual'
      ? parseFloat(plan.rows[0].annual_price || plan.rows[0].monthly_price * 12)
      : parseFloat(plan.rows[0].monthly_price);

    const expiresAt = new Date(Date.now() + 3600000);
    const externalSessionId = `chk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const result = await db.query(
      `INSERT INTO payment_checkout_sessions
         (tenant_id, plan_id, billing_cycle, amount, currency, status, external_session_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
       RETURNING *`,
      [tenantId, planId, billingCycle, amount, plan.rows[0].currency || 'USD', externalSessionId, expiresAt]
    );

    const session = result.rows[0];
    return {
      session_id: session.id,
      external_session_id: session.external_session_id,
      amount: session.amount,
      currency: session.currency,
      status: session.status,
      expires_at: session.expires_at,
      checkout_url: `${config.app.url}/subscription?session_id=${session.id}`,
    };
  }

  async getCheckoutSession(tenantId, sessionId) {
    const result = await db.query(
      `SELECT pcs.*, p.name AS plan_name
       FROM payment_checkout_sessions pcs
       JOIN plans p ON p.id = pcs.plan_id
       WHERE pcs.id = $1 AND pcs.tenant_id = $2`,
      [sessionId, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Checkout session not found');
    return result.rows[0];
  }

  async completeCheckoutSession(sessionId, paymentReference, options = {}) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const sessionResult = await client.query(
        `SELECT * FROM payment_checkout_sessions WHERE id = $1 FOR UPDATE`,
        [sessionId]
      );
      const session = sessionResult.rows[0];
      if (!session) throw new NotFoundError('Checkout session not found');
      if (session.status === 'completed') {
        await client.query('COMMIT');
        return { session, subscription: await subscriptionService.getCurrent(session.tenant_id) };
      }
      if (session.status !== 'pending') throw new ValidationError('Checkout session is not payable');
      if (new Date(session.expires_at) < new Date()) {
        await client.query(
          `UPDATE payment_checkout_sessions SET status = 'expired' WHERE id = $1`,
          [sessionId]
        );
        throw new ValidationError('Checkout session expired');
      }

      await client.query(
        `UPDATE payment_checkout_sessions
         SET status = 'completed', payment_reference = $2, completed_at = NOW()
         WHERE id = $1`,
        [sessionId, paymentReference]
      );

      const subscription = await subscriptionService.activateFromPayment(
        session.tenant_id,
        session.plan_id,
        session.billing_cycle,
        client
      );

      await client.query(
        `INSERT INTO subscription_payments
           (tenant_id, transaction_id, payment_method, payment_provider, amount, currency, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          session.tenant_id,
          paymentReference,
          options.payment_method || 'card',
          config.payments.provider,
          session.amount,
          session.currency,
          JSON.stringify({ checkout_session_id: sessionId }),
        ]
      );

      await client.query('COMMIT');
      return { session: { ...session, status: 'completed' }, subscription };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async handleWebhook(payload, secretHeader) {
    const expected = config.payments.webhookSecret;
    if (!expected) throw new ForbiddenError('Payment webhooks are not configured');
    if (!secretHeader || secretHeader !== expected) {
      throw new ForbiddenError('Invalid webhook signature');
    }

    const { session_id: sessionId, status, payment_reference: paymentReference } = payload;
    if (!sessionId) throw new ValidationError('session_id is required');
    if (status !== 'paid' && status !== 'completed') {
      return { received: true, processed: false, reason: 'ignored_status' };
    }

    const result = await this.completeCheckoutSession(
      sessionId,
      paymentReference || `webhook_${Date.now()}`
    );
    return { received: true, processed: true, subscription_id: result.subscription?.id };
  }
}

module.exports = new PaymentsService();
