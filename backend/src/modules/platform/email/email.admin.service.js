const db = require('../../../config/database');
const { NotFoundError } = require('../../../shared/errors');
const emailService = require('../../../services/email.service');

// Sample data for live template preview.
const SAMPLE_VARS = {
  business_name: 'Acme Store',
  user_name: 'Jane Doe',
  customer_name: 'John Smith',
  owner_name: 'Jane Doe',
  invoice_number: 'INV-20260618-AB12',
  order_number: 'ORD-20260618-XY99',
  purchase_order_number: 'PO-20260618-7788',
  reset_link: 'https://app.poshive.store/reset-password?token=sample',
  verification_link: 'https://app.poshive.store/verify-email?token=sample',
  subscription_name: 'Pro Plan',
  expiry_date: '2026-12-31',
  amount: '$129.00',
  app_name: 'POSHive',
  app_url: 'https://poshive.store',
};

class EmailAdminService {
  // ---- Logs ----
  async listLogs({ page = 1, limit = 25, status } = {}) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const offset = (p - 1) * l;

    const where = [];
    const params = [];
    if (status && ['queued', 'sent', 'failed'].includes(status)) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*)::int AS total FROM email_logs ${whereSql}`, params);
    const total = countRes.rows[0].total;

    params.push(l);
    params.push(offset);
    const rows = await db.query(
      `SELECT id, to_email, subject, template_slug, type, status, error_message, attempts,
              provider_message_id, created_at, sent_at
       FROM email_logs ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      items: rows.rows,
      pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
    };
  }

  // ---- Stats (dashboard widget) ----
  async getStats() {
    const res = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'sent' AND sent_at::date = CURRENT_DATE)::int AS sent_today,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
         COUNT(*) FILTER (WHERE status = 'queued')::int AS queued,
         COUNT(*) FILTER (WHERE status = 'sent')::int AS sent_total
       FROM email_logs`
    );
    return res.rows[0];
  }

  // ---- Templates ----
  async listTemplates() {
    const res = await db.query(
      `SELECT id, slug, name, subject, body_html, body_text, variables, status, tenant_id, updated_at
       FROM email_templates
       WHERE tenant_id IS NULL
       ORDER BY name ASC`
    );
    return res.rows;
  }

  async getTemplate(id) {
    const res = await db.query('SELECT * FROM email_templates WHERE id = $1 AND tenant_id IS NULL', [id]);
    if (!res.rows[0]) throw new NotFoundError('Template not found');
    return res.rows[0];
  }

  async updateTemplate(id, data) {
    await this.getTemplate(id);
    const res = await db.query(
      `UPDATE email_templates
         SET name = $1, subject = $2, body_html = $3, body_text = $4,
             status = COALESCE($5, status), updated_at = NOW()
       WHERE id = $6 AND tenant_id IS NULL RETURNING *`,
      [data.name, data.subject, data.body_html, data.body_text || null, data.status || null, id]
    );
    return res.rows[0];
  }

  // Render arbitrary subject/body (or a stored template) with sample data.
  async preview({ subject, body_html, variables } = {}) {
    const vars = { ...SAMPLE_VARS, ...(variables || {}) };
    return {
      subject: emailService.renderTemplate(subject || '', vars),
      body_html: emailService.renderTemplate(body_html || '', vars),
      sample_variables: vars,
    };
  }

  async previewTemplate(id, variables) {
    const tpl = await this.getTemplate(id);
    return this.preview({ subject: tpl.subject, body_html: tpl.body_html, variables });
  }

  get sampleVars() {
    return SAMPLE_VARS;
  }
}

module.exports = new EmailAdminService();
