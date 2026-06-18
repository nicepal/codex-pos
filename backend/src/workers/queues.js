const { Queue, Worker } = require('bullmq');
const config = require('../config');
const logger = require('../utils/logger');
const db = require('../config/database');

const connection = {
  host: config.redis.host,
  port: config.redis.port,
};

const notificationQueue = new Queue('notifications', { connection });
const shopifyImportQueue = new Queue('shopify-import', { connection });

async function addNotificationJob(data) {
  return notificationQueue.add('send', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
}

async function addShopifyImportJob(data) {
  return shopifyImportQueue.add('import', data, {
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

  logger.info('BullMQ workers started');
  return worker;
}

module.exports = { notificationQueue, addNotificationJob, shopifyImportQueue, addShopifyImportJob, startWorkers };
