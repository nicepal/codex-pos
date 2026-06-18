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
  const { tenantId, userId, channel, title, message, type, phone } = job.data;

  await db.query(
    `INSERT INTO notifications (tenant_id, user_id, type, channel, title, message, status, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'sent', NOW())`,
    [tenantId, userId, type || 'general', channel || 'in_app', title, message]
  );

  if (channel === 'email') {
    const nodemailer = require('nodemailer');
    if (config.smtp.host) {
      const transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        auth: { user: config.smtp.user, pass: config.smtp.pass },
      });
      await transporter.sendMail({
        from: config.smtp.from,
        to: job.data.email,
        subject: title,
        html: message,
      });
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
