const { Queue, Worker } = require('bullmq');
const config = require('../config');
const logger = require('../utils/logger');
const db = require('../config/database');

const connection = {
  host: config.redis.host,
  port: config.redis.port,
};

let notificationQueue;
let shopifyImportQueue;

function attachQueueError(queue, label) {
  queue.on('error', (err) => {
    logger.error(`${label} queue error`, logger.formatError(err));
  });
  return queue;
}

function getNotificationQueue() {
  if (!notificationQueue) {
    notificationQueue = attachQueueError(new Queue('notifications', { connection }), 'notifications');
  }
  return notificationQueue;
}

function getShopifyImportQueue() {
  if (!shopifyImportQueue) {
    shopifyImportQueue = attachQueueError(new Queue('shopify-import', { connection }), 'shopify-import');
  }
  return shopifyImportQueue;
}

async function addNotificationJob(data) {
  return getNotificationQueue().add('send', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
}

async function addShopifyImportJob(data) {
  return getShopifyImportQueue().add('import', data, {
    attempts: 1, // long-running; failures are recorded on the job row, no auto-retry
    removeOnComplete: 50,
    removeOnFail: 50,
  });
}

async function processNotification(job) {
  const { tenantId, userId, channel, title, message, type, phone, email, text, replyTo, emailLogId } = job.data;

  await db.query(
    `INSERT INTO notifications (tenant_id, user_id, type, channel, title, message, status, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'sent', NOW())`,
    [tenantId, userId, type || 'general', channel || 'in_app', title, message]
  );

  if (channel === 'email') {
    const smtpService = require('../modules/platform/email/smtp.service');
    const { markLog } = require('../services/email.service');
    try {
      const cfg = await smtpService.getActiveConfig(tenantId);
      if (!cfg) {
        // No SMTP configured at all: record and stop (no point retrying).
        await markLog(emailLogId, 'failed', { error: 'SMTP not configured' });
        logger.info('Email skipped (SMTP not configured)', { to: email, subject: title });
        return;
      }
      const { messageId } = await smtpService.sendNow({ to: email, subject: title, html: message, text, replyTo, tenantId });
      await markLog(emailLogId, 'sent', { messageId });
    } catch (err) {
      // Record the failure reason; rethrow so BullMQ retries (attempts: 3).
      await markLog(emailLogId, 'failed', { error: smtpService.friendlyError(err) });
      throw err;
    }
  } else if (channel === 'sms') {
    const smsService = require('../services/sms.service');
    await smsService.sendSms(phone, `${title}\n\n${stripHtml(message)}`);
  } else if (channel === 'whatsapp') {
    const smsService = require('../services/sms.service');
    await smsService.sendWhatsApp(phone, `*${title}*\n\n${stripHtml(message)}`);
  }

  // Push to any connected dashboards in real time
  try {
    const { emitToTenant } = require('../realtime/socket');
    emitToTenant(tenantId, 'notification', { title, message, type: type || 'general', channel: channel || 'in_app' });
  } catch (_) { /* realtime optional */ }

  logger.info('Notification processed', { jobId: job.id, channel });
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, '').trim();
}

/**
 * Periodic billing / lifecycle tasks:
 * (a) trial expiry warning emails (within 3 days)
 * (b) cancel subscriptions past period with cancel_at_period_end
 * (c) process pending abandoned-cart recovery jobs
 * Also retries failed webhook deliveries.
 */
async function processBillingLifecycle() {
  const summary = { trialEmails: 0, cancelledSubs: 0, cartRecoveries: 0, webhookRetries: 0 };

  // (a) Trial expiry emails
  try {
    const trials = await db.query(
      `SELECT id, name, email, trial_ends_at FROM tenants
       WHERE trial_ends_at IS NOT NULL
         AND trial_ends_at > NOW()
         AND trial_ends_at <= NOW() + INTERVAL '3 days'
         AND status IN ('trial', 'active')
         AND email IS NOT NULL`
    );
    const emailService = require('../services/email.service');
    for (const t of trials.rows) {
      try {
        const already = await db.query(
          `SELECT id FROM email_logs
           WHERE tenant_id = $1 AND type = 'trial_expiry'
             AND created_at >= NOW() - INTERVAL '2 days'
           LIMIT 1`,
          [t.id]
        );
        if (already.rows[0]) continue;

        await emailService.send({
          to: t.email,
          subject: 'Your PosHive trial is ending soon',
          html: `<p>Hi ${t.name || 'there'},</p><p>Your trial ends on <strong>${new Date(t.trial_ends_at).toUTCString()}</strong>. Upgrade to keep your store running without interruption.</p>`,
          text: `Your trial ends on ${new Date(t.trial_ends_at).toUTCString()}. Upgrade to keep access.`,
          tenantId: t.id,
          type: 'trial_expiry',
        });
        summary.trialEmails += 1;
      } catch (err) {
        logger.warn('trial_expiry email failed', { tenantId: t.id, error: err.message });
      }
    }
  } catch (err) {
    logger.warn('processBillingLifecycle trial scan failed', { error: err.message });
  }

  // (b) Cancel subscriptions flagged cancel_at_period_end whose period ended
  try {
    const result = await db.query(
      `UPDATE subscriptions
       SET status = 'cancelled', cancelled_at = COALESCE(cancelled_at, NOW()), updated_at = NOW()
       WHERE cancel_at_period_end = true
         AND status IN ('active', 'trialing', 'past_due')
         AND current_period_end IS NOT NULL
         AND current_period_end <= NOW()
       RETURNING id, tenant_id`
    );
    summary.cancelledSubs = result.rows.length;
    for (const sub of result.rows) {
      await db.query(
        `UPDATE tenants SET status = CASE WHEN status = 'active' THEN 'cancelled' ELSE status END
         WHERE id = $1`,
        [sub.tenant_id]
      ).catch(() => {});
    }
  } catch (err) {
    logger.warn('processBillingLifecycle cancel scan failed', { error: err.message });
  }

  // (c) Abandoned cart recovery jobs
  try {
    const jobs = await db.query(
      `SELECT j.*, c.email, c.items
       FROM cart_recovery_jobs j
       JOIN storefront_carts c ON c.id = j.cart_id
       WHERE j.status = 'pending' AND j.scheduled_at <= NOW()
       ORDER BY j.scheduled_at ASC
       LIMIT 40`
    );
    const emailService = require('../services/email.service');
    for (const job of jobs.rows) {
      try {
        if (!job.email) {
          await db.query(
            `UPDATE cart_recovery_jobs SET status = 'failed', error_message = 'No email' WHERE id = $1`,
            [job.id]
          );
          continue;
        }
        await emailService.send({
          to: job.email,
          subject: 'You left items in your cart',
          html: '<p>You still have items waiting in your cart. Come back and complete your purchase!</p>',
          text: 'You still have items waiting in your cart.',
          tenantId: job.tenant_id,
          type: 'cart_recovery',
        });
        await db.query(
          `UPDATE cart_recovery_jobs SET status = 'sent', sent_at = NOW() WHERE id = $1`,
          [job.id]
        );
        await db.query(
          `UPDATE storefront_carts
           SET recovery_emails_sent = recovery_emails_sent + 1, updated_at = NOW()
           WHERE id = $1`,
          [job.cart_id]
        );
        summary.cartRecoveries += 1;
      } catch (err) {
        await db.query(
          `UPDATE cart_recovery_jobs SET status = 'failed', error_message = $2 WHERE id = $1`,
          [job.id, err.message]
        );
      }
    }
  } catch (err) {
    logger.warn('processBillingLifecycle cart recovery failed', { error: err.message });
  }

  // Webhook delivery retries
  try {
    const webhookService = require('../modules/webhooks/webhooks.service');
    const wr = await webhookService.retryFailedDeliveries({ limit: 40 });
    summary.webhookRetries = wr.retried;
  } catch (err) {
    logger.warn('processBillingLifecycle webhook retry failed', { error: err.message });
  }

  logger.info('Billing lifecycle tick', summary);
  return summary;
}

async function processScheduledReports() {
  const summary = { sent: 0, failed: 0 };
  try {
    const due = await db.query(
      `SELECT * FROM scheduled_reports
       WHERE status = 'active'
         AND (
           last_run_at IS NULL
           OR (schedule = 'daily' AND last_run_at <= NOW() - INTERVAL '23 hours')
           OR (schedule = 'weekly' AND last_run_at <= NOW() - INTERVAL '6 days 23 hours')
           OR (schedule = 'monthly' AND last_run_at <= NOW() - INTERVAL '27 days')
         )
       ORDER BY COALESCE(last_run_at, created_at) ASC
       LIMIT 15`
    );
    if (!due.rows.length) return summary;

    const reportService = require('../modules/reports/reports.service');
    const emailService = require('../services/email.service');

    for (const row of due.rows) {
      try {
        const tenant = await db.query('SELECT name FROM tenants WHERE id = $1', [row.tenant_id]);
        const tenantName = tenant.rows[0]?.name || 'PosHive';
        const to = new Date().toISOString();
        const from = row.schedule === 'monthly'
          ? new Date(Date.now() - 30 * 86400000).toISOString()
          : row.schedule === 'weekly'
            ? new Date(Date.now() - 7 * 86400000).toISOString()
            : new Date(Date.now() - 86400000).toISOString();

        let body = '';
        if (row.report_type === 'inventory') {
          const inv = await reportService.inventoryReport(row.tenant_id);
          const s = inv.summary;
          body = `product_count,total_units,total_value\n${s.product_count},${s.total_units},${s.total_value}`;
        } else if (row.report_type === 'financial') {
          const fin = await reportService.financialReport(row.tenant_id, from, to);
          body = `revenue,expenses,profit\n${fin.revenue},${fin.expenses},${fin.profit}`;
        } else {
          body = await reportService.exportSalesCsv(row.tenant_id, { from, to });
        }

        const subject = `${tenantName} — ${row.report_type} report (${row.schedule})`;
        await emailService.send({
          to: row.email,
          subject,
          html: `<p>Your scheduled <strong>${row.report_type}</strong> report from PosHive.</p><pre style="white-space:pre-wrap;font-size:12px">${String(body).replace(/</g, '&lt;')}</pre>`,
          text: body,
          tenantId: row.tenant_id,
          type: 'scheduled_report',
        });
        await db.query('UPDATE scheduled_reports SET last_run_at = NOW() WHERE id = $1', [row.id]);
        summary.sent += 1;
      } catch (err) {
        summary.failed += 1;
        logger.warn('Scheduled report delivery failed', { id: row.id, error: err.message });
      }
    }
  } catch (err) {
    logger.warn('processScheduledReports scan failed', { error: err.message });
  }
  if (summary.sent || summary.failed) {
    logger.info('Scheduled reports tick', summary);
  }
  return summary;
}

function startWorkers() {
  const worker = new Worker('notifications', processNotification, { connection });

  worker.on('completed', (job) => logger.debug(`Job ${job.id} completed`));
  worker.on('failed', (job, err) => logger.error(`Job ${job?.id} failed`, { error: err.message }));

  const { processShopifyImport } = require('../modules/integrations/shopify/shopify.worker');
  const shopifyWorker = new Worker('shopify-import', processShopifyImport, {
    connection,
    concurrency: 1,
    lockDuration: 10 * 60 * 1000, // imports can run long; keep the lock alive
  });
  shopifyWorker.on('completed', (job) => logger.debug(`Shopify import job ${job.id} completed`));
  shopifyWorker.on('failed', (job, err) => logger.error(`Shopify import job ${job?.id} failed`, { error: err.message }));

  // Run lifecycle shortly after boot, then every hour
  const LIFECYCLE_MS = 60 * 60 * 1000;
  setTimeout(() => {
    processBillingLifecycle().catch((err) => logger.warn('Billing lifecycle error', { error: err.message }));
    processScheduledReports().catch((err) => logger.warn('Scheduled reports error', { error: err.message }));
  }, 15 * 1000);
  setInterval(() => {
    processBillingLifecycle().catch((err) => logger.warn('Billing lifecycle error', { error: err.message }));
    processScheduledReports().catch((err) => logger.warn('Scheduled reports error', { error: err.message }));
  }, LIFECYCLE_MS).unref?.();

  logger.info('BullMQ workers started');
  return worker;
}

module.exports = {
  get notificationQueue() { return getNotificationQueue(); },
  addNotificationJob,
  get shopifyImportQueue() { return getShopifyImportQueue(); },
  addShopifyImportJob,
  processBillingLifecycle,
  processScheduledReports,
  startWorkers,
};
