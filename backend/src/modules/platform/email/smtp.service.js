const db = require('../../../config/database');
const config = require('../../../config');
const logger = require('../../../utils/logger');
const { encrypt, decrypt } = require('../../../utils/crypto');

const MASK = '************';
const CACHE_TTL_MS = 30 * 1000;

let cache = { at: 0, byTenant: new Map(), global: null };

function invalidateCache() {
  cache = { at: 0, byTenant: new Map(), global: null };
}

function rowToConfig(row) {
  if (!row) return null;
  let password = null;
  if (row.password_encrypted) {
    try {
      password = decrypt(row.password_encrypted);
    } catch (err) {
      logger.error('Failed to decrypt SMTP password', { error: err.message });
      password = null;
    }
  }
  return {
    id: row.id,
    tenantId: row.tenant_id || null,
    host: row.host,
    port: row.port,
    username: row.username || null,
    password,
    encryption: row.encryption || 'tls',
    fromEmail: row.from_email,
    fromName: row.from_name || null,
    replyToEmail: row.reply_to_email || null,
    isEnabled: row.is_enabled,
    source: 'db',
  };
}

// Env fallback so the platform keeps working before a Super Admin configures SMTP.
function envConfig() {
  if (!config.smtp.host) return null;
  return {
    id: null,
    tenantId: null,
    host: config.smtp.host,
    port: config.smtp.port,
    username: config.smtp.user || null,
    password: config.smtp.pass || null,
    encryption: config.smtp.port === 465 ? 'ssl' : 'tls',
    fromEmail: config.smtp.from,
    fromName: config.app.name,
    replyToEmail: null,
    isEnabled: true,
    source: 'env',
  };
}

async function loadGlobalRow() {
  const res = await db.query('SELECT * FROM smtp_settings WHERE tenant_id IS NULL LIMIT 1');
  return res.rows[0] || null;
}

async function getGlobalRow() {
  return loadGlobalRow();
}

/**
 * Resolve the active SMTP config: tenant override -> global DB -> env fallback.
 * Returns null if nothing is usable. Includes the decrypted password (server-side only).
 */
async function getActiveConfig(tenantId = null) {
  const now = Date.now();
  if (now - cache.at > CACHE_TTL_MS) invalidateCache();

  if (tenantId) {
    if (cache.byTenant.has(tenantId)) return cache.byTenant.get(tenantId);
    const res = await db.query('SELECT * FROM smtp_settings WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    const cfg = rowToConfig(res.rows[0]);
    if (cfg && cfg.isEnabled) {
      cache.at = now;
      cache.byTenant.set(tenantId, cfg);
      return cfg;
    }
  }

  if (cache.global !== null && now - cache.at <= CACHE_TTL_MS) {
    return cache.global || envConfig();
  }

  const globalRow = await loadGlobalRow();
  const globalCfg = rowToConfig(globalRow);
  cache.at = now;
  cache.global = globalCfg && globalCfg.isEnabled ? globalCfg : null;
  return cache.global || envConfig();
}

// Public-safe view (password masked, never the real secret).
async function getMaskedConfig() {
  const row = await getGlobalRow();
  if (!row) {
    const env = envConfig();
    return {
      configured: !!env,
      source: env ? 'env' : 'none',
      host: env?.host || '',
      port: env?.port || 587,
      username: env?.username || '',
      password: env?.password ? MASK : '',
      encryption: env?.encryption || 'tls',
      from_email: env?.fromEmail || '',
      from_name: env?.fromName || '',
      reply_to_email: env?.replyToEmail || '',
      is_enabled: false,
    };
  }
  return {
    configured: true,
    source: 'db',
    id: row.id,
    host: row.host,
    port: row.port,
    username: row.username || '',
    password: row.password_encrypted ? MASK : '',
    encryption: row.encryption,
    from_email: row.from_email,
    from_name: row.from_name || '',
    reply_to_email: row.reply_to_email || '',
    is_enabled: row.is_enabled,
    updated_at: row.updated_at,
  };
}

/**
 * Upsert the global SMTP config. Only re-encrypts the password when a new,
 * non-masked value is supplied; otherwise keeps the stored secret.
 */
async function saveConfig(payload) {
  const existing = await getGlobalRow();

  let passwordEncrypted = existing ? existing.password_encrypted : null;
  if (payload.password && payload.password !== MASK) {
    passwordEncrypted = encrypt(payload.password);
  }

  const fields = {
    host: payload.host,
    port: payload.port,
    username: payload.username || null,
    password_encrypted: passwordEncrypted,
    encryption: payload.encryption || 'tls',
    from_email: payload.from_email,
    from_name: payload.from_name || null,
    reply_to_email: payload.reply_to_email || null,
    is_enabled: payload.is_enabled != null ? !!payload.is_enabled : (existing ? existing.is_enabled : false),
  };

  let row;
  if (existing) {
    const res = await db.query(
      `UPDATE smtp_settings SET
         host=$1, port=$2, username=$3, password_encrypted=$4, encryption=$5,
         from_email=$6, from_name=$7, reply_to_email=$8, is_enabled=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [fields.host, fields.port, fields.username, fields.password_encrypted, fields.encryption,
        fields.from_email, fields.from_name, fields.reply_to_email, fields.is_enabled, existing.id]
    );
    row = res.rows[0];
  } else {
    const res = await db.query(
      `INSERT INTO smtp_settings
         (tenant_id, host, port, username, password_encrypted, encryption, from_email, from_name, reply_to_email, is_enabled)
       VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [fields.host, fields.port, fields.username, fields.password_encrypted, fields.encryption,
        fields.from_email, fields.from_name, fields.reply_to_email, fields.is_enabled]
    );
    row = res.rows[0];
  }

  invalidateCache();
  return getMaskedConfig();
}

// Build a nodemailer transport from a resolved config object.
function buildTransport(cfg) {
  const nodemailer = require('nodemailer');
  const options = {
    host: cfg.host,
    port: cfg.port,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  };
  if (cfg.encryption === 'ssl') {
    options.secure = true;
  } else if (cfg.encryption === 'tls') {
    options.secure = false;
    options.requireTLS = true;
  } else {
    options.secure = false;
  }
  if (cfg.username) {
    options.auth = { user: cfg.username, pass: cfg.password || '' };
  }
  return nodemailer.createTransport(options);
}

function fromHeader(cfg) {
  return cfg.fromName ? `"${cfg.fromName}" <${cfg.fromEmail}>` : cfg.fromEmail;
}

// Verify connection/auth against a (possibly unsaved) config payload.
async function verifyConnection(cfg) {
  const transport = buildTransport(cfg);
  await transport.verify();
  return true;
}

function friendlyError(err) {
  const code = err && err.code;
  if (code === 'EAUTH') return 'Authentication failed: check username and password.';
  if (code === 'ECONNECTION' || code === 'ESOCKET') return 'Connection failed: check host, port and encryption.';
  if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED') return 'Connection timed out or refused: check host/port and firewall.';
  if (code === 'EDNS' || (err && /getaddrinfo/.test(err.message || ''))) return 'Invalid SMTP host (DNS lookup failed).';
  return err && err.message ? err.message : 'Unknown SMTP error';
}

/**
 * Send a test email using either a provided config payload (from the form,
 * password may be masked -> fall back to stored secret) or the active config.
 */
async function sendTestEmail(toEmail, formCfg = null) {
  let cfg;
  if (formCfg) {
    let password = formCfg.password;
    if (!password || password === MASK) {
      const existing = await getGlobalRow();
      password = existing && existing.password_encrypted ? decrypt(existing.password_encrypted) : '';
    }
    cfg = {
      host: formCfg.host,
      port: formCfg.port,
      username: formCfg.username || null,
      password,
      encryption: formCfg.encryption || 'tls',
      fromEmail: formCfg.from_email,
      fromName: formCfg.from_name || config.app.name,
      replyToEmail: formCfg.reply_to_email || null,
    };
  } else {
    cfg = await getActiveConfig();
    if (!cfg) throw new Error('No SMTP configuration found. Configure SMTP first.');
  }

  try {
    const transport = buildTransport(cfg);
    await transport.verify();
    const info = await transport.sendMail({
      from: fromHeader(cfg),
      to: toEmail,
      replyTo: cfg.replyToEmail || undefined,
      subject: `${config.app.name} SMTP test email`,
      html: `<p>This is a test email from <strong>${config.app.name}</strong>.</p>
             <p>If you received this, your SMTP configuration is working correctly.</p>
             <p>Sent at ${new Date().toISOString()}</p>`,
      text: `This is a test email from ${config.app.name}. Your SMTP configuration is working.`,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    logger.warn('SMTP test failed', { error: err.message, code: err.code });
    return { success: false, error: friendlyError(err), code: err.code || null };
  }
}

// Low-level send used by the queue worker. Throws on failure (for retry).
async function sendNow({ to, subject, html, text, replyTo, tenantId = null }) {
  const cfg = await getActiveConfig(tenantId);
  if (!cfg) {
    const e = new Error('SMTP not configured');
    e.code = 'NO_SMTP';
    throw e;
  }
  const transport = buildTransport(cfg);
  const info = await transport.sendMail({
    from: fromHeader(cfg),
    to,
    replyTo: replyTo || cfg.replyToEmail || undefined,
    subject,
    html,
    text: text || (html ? String(html).replace(/<[^>]+>/g, '') : ''),
  });
  return { messageId: info.messageId };
}

function isConfigured() {
  return !!(config.smtp.host);
}

module.exports = {
  MASK,
  invalidateCache,
  getActiveConfig,
  getGlobalRow,
  getMaskedConfig,
  saveConfig,
  buildTransport,
  verifyConnection,
  sendTestEmail,
  sendNow,
  friendlyError,
  isConfigured,
};
