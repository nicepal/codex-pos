const db = require('../config/database');
const config = require('../config');
const logger = require('../utils/logger');
const { addNotificationJob } = require('../workers/queues');

function renderTemplate(text, variables = {}) {
  if (!text) return '';
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? '');
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

async function sendEmail({ to, subject, html, text, tenantId, userId, type = 'email' }) {
  const payload = {
    tenantId,
    userId,
    channel: 'email',
    email: to,
    title: subject,
    message: html,
    type,
  };

  try {
    await addNotificationJob(payload);
    return { queued: true };
  } catch (err) {
    logger.warn('Queue unavailable, sending email inline', { error: err.message });
    return sendEmailInline({ to, subject, html, text });
  }
}

async function sendEmailInline({ to, subject, html, text }) {
  if (!config.smtp.host) {
    logger.info('Email (dev mode - SMTP not configured)', { to, subject });
    return { sent: false, dev: true };
  }

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });

  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    html,
    text: text || html?.replace(/<[^>]+>/g, ''),
  });

  return { sent: true };
}

async function sendTemplatedEmail(slug, to, variables, { tenantId, userId } = {}) {
  const template = await getTemplate(slug, tenantId);
  if (!template) {
    logger.warn(`Email template not found: ${slug}`);
    return { sent: false, reason: 'template_not_found' };
  }

  const subject = renderTemplate(template.subject, variables);
  const html = renderTemplate(template.body_html, variables);

  return sendEmail({ to, subject, html, tenantId, userId, type: slug });
}

async function sendWelcomeEmail(user, tenant) {
  return sendTemplatedEmail('welcome', user.email, {
    business_name: tenant.name,
    owner_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
  }, { tenantId: tenant.id, userId: user.id });
}

module.exports = {
  renderTemplate,
  sendEmail,
  sendTemplatedEmail,
  sendWelcomeEmail,
};
