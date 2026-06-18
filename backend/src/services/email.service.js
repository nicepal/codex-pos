const db = require('../config/database');
const config = require('../config');
const logger = require('../utils/logger');
const { addNotificationJob } = require('../workers/queues');

/**
 * Centralized EmailService.
 *
 * Every email in the platform must flow through here. It renders templates,
 * records an `email_logs` row (status `queued`), and enqueues the send on the
 * BullMQ notifications queue. The worker performs the actual SMTP delivery via
 * `smtp.service` and updates the log row to `sent`/`failed`. If Redis is
 * unavailable we fall back to an inline send so transactional mail still works.
 */

const SUPPORTED_VARIABLES = [
  'business_name', 'user_name', 'customer_name', 'invoice_number', 'order_number',
  'reset_link', 'verification_link', 'subscription_name', 'expiry_date',
  'owner_name', 'purchase_order_number', 'amount', 'app_name', 'app_url',
];

function renderTemplate(text, variables = {}) {
  if (!text) return '';
  const vars = { app_name: config.app.name, app_url: config.app.url, ...variables };
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (vars[key] != null ? String(vars[key]) : ''));
}

async function getTemplate(slug, tenantId = null) {
  const result = await db.query(
    `SELECT * FROM email_templates
     WHERE slug = $1 AND (tenant_id IS NOT DISTINCT FROM $2 OR tenant_id IS NULL)
     ORDER BY tenant_id NULLS LAST LIMIT 1`,
    [slug, tenantId]
  );
  return result.rows[0];
}

async function createLog({ to, subject, templateSlug, type, tenantId }) {
  try {
    const res = await db.query(
      `INSERT INTO email_logs (tenant_id, to_email, subject, template_slug, type, status, attempts)
       VALUES ($1, $2, $3, $4, $5, 'queued', 0) RETURNING id`,
      [tenantId || null, to, subject || null, templateSlug || null, type || null]
    );
    return res.rows[0].id;
  } catch (err) {
    logger.warn('Failed to create email_logs row', { error: err.message });
    return null;
  }
}

async function markLog(logId, status, { error, messageId } = {}) {
  if (!logId) return;
  try {
    await db.query(
      `UPDATE email_logs
         SET status = $1, error_message = $2, provider_message_id = $3,
             attempts = attempts + 1,
             sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE sent_at END
       WHERE id = $4`,
      [status, error || null, messageId || null, logId]
    );
  } catch (err) {
    logger.warn('Failed to update email_logs row', { error: err.message });
  }
}

/**
 * Core send. Renders nothing (expects subject/html), logs, and enqueues.
 */
async function send({ to, subject, html, text, replyTo, tenantId, userId, type = 'email', templateSlug = null }) {
  if (!to) return { sent: false, reason: 'no_recipient' };

  const logId = await createLog({ to, subject, templateSlug, type, tenantId });

  const payload = {
    tenantId,
    userId,
    channel: 'email',
    email: to,
    title: subject,
    message: html,
    text,
    replyTo,
    type,
    emailLogId: logId,
  };

  try {
    await addNotificationJob(payload);
    return { queued: true, logId };
  } catch (err) {
    logger.warn('Queue unavailable, sending email inline', { error: err.message });
    return sendInline({ to, subject, html, text, replyTo, tenantId, logId });
  }
}

// Alias kept for backwards compatibility with existing callers.
async function sendEmail(args) {
  return send(args);
}

async function queue(args) {
  return send(args);
}

async function sendInline({ to, subject, html, text, replyTo, tenantId, logId }) {
  const smtpService = require('../modules/platform/email/smtp.service');
  try {
    const cfg = await smtpService.getActiveConfig(tenantId);
    if (!cfg) {
      logger.info('Email (dev mode - SMTP not configured)', { to, subject });
      await markLog(logId, 'failed', { error: 'SMTP not configured' });
      return { sent: false, dev: true };
    }
    const { messageId } = await smtpService.sendNow({ to, subject, html, text, replyTo, tenantId });
    await markLog(logId, 'sent', { messageId });
    return { sent: true };
  } catch (err) {
    await markLog(logId, 'failed', { error: err.message });
    logger.error('Inline email send failed', { error: err.message });
    return { sent: false, error: err.message };
  }
}

/**
 * Render a stored template and send. Falls back to a minimal HTML body if the
 * template is missing, so transactional mail is never silently dropped.
 */
async function sendTemplate(slug, to, variables = {}, { tenantId, userId, fallbackSubject, fallbackHtml } = {}) {
  const template = await getTemplate(slug, tenantId);

  let subject;
  let html;
  if (template) {
    subject = renderTemplate(template.subject, variables);
    html = renderTemplate(template.body_html, variables);
  } else if (fallbackSubject || fallbackHtml) {
    subject = renderTemplate(fallbackSubject || slug, variables);
    html = renderTemplate(fallbackHtml || '', variables);
  } else {
    logger.warn(`Email template not found: ${slug}`);
    return { sent: false, reason: 'template_not_found' };
  }

  return send({ to, subject, html, tenantId, userId, type: slug, templateSlug: slug });
}

// Backwards-compatible name.
async function sendTemplatedEmail(slug, to, variables, ctx = {}) {
  return sendTemplate(slug, to, variables, ctx);
}

// ---- High-level helpers (every flow goes through these) ----

async function sendWelcomeEmail(user, tenant) {
  return sendTemplate('welcome', user.email, {
    business_name: tenant.name,
    user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
    owner_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
  }, {
    tenantId: tenant.id,
    userId: user.id,
    fallbackSubject: 'Welcome to {{business_name}}!',
    fallbackHtml: '<p>Hello {{user_name}}, welcome to {{app_name}}!</p>',
  });
}

async function sendPasswordReset(user, resetLink, tenant = null) {
  return sendTemplate('password_reset', user.email, {
    user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
    business_name: tenant?.name || config.app.name,
    reset_link: resetLink,
  }, {
    tenantId: user.tenant_id || tenant?.id || null,
    userId: user.id,
    fallbackSubject: 'Reset your password',
    fallbackHtml: '<p>Hello {{user_name}},</p><p>Click the link below to reset your password:</p><p><a href="{{reset_link}}">{{reset_link}}</a></p><p>This link expires in 1 hour.</p>',
  });
}

async function sendVerification(user, verificationLink, tenant = null) {
  return sendTemplate('email_verification', user.email, {
    user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
    business_name: tenant?.name || config.app.name,
    verification_link: verificationLink,
  }, {
    tenantId: user.tenant_id || tenant?.id || null,
    userId: user.id,
    fallbackSubject: 'Verify your email address',
    fallbackHtml: '<p>Hello {{user_name}},</p><p>Please verify your email address:</p><p><a href="{{verification_link}}">{{verification_link}}</a></p>',
  });
}

async function sendInvoice(to, variables = {}, ctx = {}) {
  return sendTemplate('invoice', to, variables, {
    ...ctx,
    fallbackSubject: 'Invoice {{invoice_number}}',
    fallbackHtml: '<p>Hello {{customer_name}},</p><p>Your invoice <strong>{{invoice_number}}</strong> for {{amount}} is ready.</p>',
  });
}

async function sendPurchaseOrder(to, variables = {}, ctx = {}) {
  return sendTemplate('purchase_order', to, variables, {
    ...ctx,
    fallbackSubject: 'Purchase Order {{purchase_order_number}}',
    fallbackHtml: '<p>Hello,</p><p>Please find purchase order <strong>{{purchase_order_number}}</strong> from {{business_name}}.</p>',
  });
}

async function sendSubscriptionActivated(to, variables = {}, ctx = {}) {
  return sendTemplate('subscription_activated', to, variables, {
    ...ctx,
    fallbackSubject: 'Your {{subscription_name}} subscription is active',
    fallbackHtml: '<p>Hello {{user_name}},</p><p>Your subscription <strong>{{subscription_name}}</strong> is now active.</p>',
  });
}

async function sendSubscriptionExpired(to, variables = {}, ctx = {}) {
  return sendTemplate('subscription_expired', to, variables, {
    ...ctx,
    fallbackSubject: 'Your subscription has expired',
    fallbackHtml: '<p>Hello {{user_name}},</p><p>Your subscription <strong>{{subscription_name}}</strong> expired on {{expiry_date}}.</p>',
  });
}

/**
 * Direct test send (bypasses queue) used by the admin "send test" endpoint.
 */
async function sendTestEmail(to, formCfg = null) {
  const smtpService = require('../modules/platform/email/smtp.service');
  const logId = await createLog({ to, subject: `${config.app.name} SMTP test email`, templateSlug: null, type: 'test', tenantId: null });
  const result = await smtpService.sendTestEmail(to, formCfg);
  await markLog(logId, result.success ? 'sent' : 'failed', { error: result.error, messageId: result.messageId });
  return result;
}

module.exports = {
  SUPPORTED_VARIABLES,
  renderTemplate,
  getTemplate,
  markLog,
  send,
  queue,
  sendEmail,
  sendTemplate,
  sendTemplatedEmail,
  sendWelcomeEmail,
  sendPasswordReset,
  sendVerification,
  sendInvoice,
  sendPurchaseOrder,
  sendSubscriptionActivated,
  sendSubscriptionExpired,
  sendTestEmail,
};
