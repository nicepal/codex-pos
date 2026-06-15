const db = require('../../config/database');
const { generateInvoiceNumber } = require('../../utils/helpers');
const { NotFoundError, ValidationError } = require('../../shared/errors');

class BillingService {
  async createInvoice(data) {
    const total = (parseFloat(data.amount) || 0) + (parseFloat(data.tax) || 0) - (parseFloat(data.discount) || 0);
    const result = await db.query(
      `INSERT INTO invoices (tenant_id, plan_id, invoice_number, amount, tax, discount, total, currency, status, due_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        data.tenant_id,
        data.plan_id || null,
        generateInvoiceNumber(),
        data.amount,
        data.tax || 0,
        data.discount || 0,
        total,
        (data.currency || 'USD').toUpperCase(),
        data.status || 'pending',
        data.due_date || null,
        data.notes || null,
      ]
    );
    return this.getById(result.rows[0].id);
  }

  async getById(id) {
    const result = await db.query(
      `SELECT i.*, t.name AS tenant_name, t.email AS tenant_email, t.slug AS tenant_slug,
              p.name AS plan_name
       FROM invoices i
       LEFT JOIN tenants t ON t.id = i.tenant_id
       LEFT JOIN plans p ON p.id = i.plan_id
       WHERE i.id = $1`,
      [id]
    );
    if (!result.rows[0]) throw new NotFoundError('Invoice not found');

    const payments = await db.query(
      `SELECT * FROM subscription_payments WHERE invoice_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    return { ...result.rows[0], payments: payments.rows };
  }

  async markPaid(invoiceId, paymentData = {}) {
    const existing = await db.query('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
    if (!existing.rows[0]) throw new NotFoundError('Invoice not found');
    if (existing.rows[0].status === 'paid') throw new ValidationError('Invoice is already paid');

    await db.query(
      `UPDATE invoices SET status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [invoiceId]
    );

    const invoice = existing.rows[0];
    await db.query(
      `INSERT INTO subscription_payments (tenant_id, invoice_id, transaction_id, payment_method, payment_provider, amount, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        invoice.tenant_id,
        invoiceId,
        paymentData.transaction_id || `TXN-${Date.now()}`,
        paymentData.payment_method || 'manual',
        paymentData.provider || 'manual',
        invoice.total,
        invoice.currency,
      ]
    );

    return this.getById(invoiceId);
  }

  async cancel(invoiceId) {
    const result = await db.query(
      `UPDATE invoices SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND status IN ('pending', 'failed') RETURNING id`,
      [invoiceId]
    );
    if (!result.rows[0]) {
      throw new ValidationError('Only pending or failed invoices can be cancelled');
    }
    return this.getById(invoiceId);
  }

  async listAll(query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const conditions = ['1=1'];
    const params = [];
    let idx = 1;

    if (query.status) {
      conditions.push(`i.status = $${idx++}`);
      params.push(query.status);
    }
    if (query.tenant_id) {
      conditions.push(`i.tenant_id = $${idx++}`);
      params.push(query.tenant_id);
    }

    const where = conditions.join(' AND ');
    const count = await db.query(`SELECT COUNT(*)::int AS total FROM invoices i WHERE ${where}`, params);
    const result = await db.query(
      `SELECT i.*, t.name AS tenant_name, p.name AS plan_name
       FROM invoices i
       LEFT JOIN tenants t ON t.id = i.tenant_id
       LEFT JOIN plans p ON p.id = i.plan_id
       WHERE ${where}
       ORDER BY i.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return {
      rows: result.rows,
      pagination: {
        total: count.rows[0].total,
        page,
        limit,
        totalPages: Math.ceil(count.rows[0].total / limit),
      },
    };
  }
}

module.exports = new BillingService();
