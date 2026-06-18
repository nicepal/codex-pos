const crypto = require('crypto');
const config = require('../config');

// AES-256-GCM symmetric encryption for sensitive secrets (e.g. Shopify access tokens).
// Stored format: base64(iv) : base64(authTag) : base64(ciphertext)

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit nonce recommended for GCM

let cachedKey = null;

function getKey() {
  if (cachedKey) return cachedKey;
  const secret = config.security && config.security.encryptionKey;
  if (!secret) {
    throw new Error('ENCRYPTION_KEY (or JWT_ACCESS_SECRET) must be set to encrypt secrets');
  }
  // Derive a stable 32-byte key from the configured secret.
  cachedKey = crypto.scryptSync(String(secret), 'poshive-encryption-salt', 32);
  return cachedKey;
}

function encrypt(plainText) {
  if (plainText === null || plainText === undefined) return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

function decrypt(payload) {
  if (payload === null || payload === undefined || payload === '') return null;
  const parts = String(payload).split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }
  const key = getKey();
  const iv = Buffer.from(parts[0], 'base64');
  const tag = Buffer.from(parts[1], 'base64');
  const ciphertext = Buffer.from(parts[2], 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

// Mask a secret for safe display (keeps last 4 chars).
function mask(value, visible = 4) {
  if (!value) return '';
  const str = String(value);
  if (str.length <= visible) return '*'.repeat(str.length);
  return '*'.repeat(Math.min(str.length - visible, 8)) + str.slice(-visible);
}

module.exports = { encrypt, decrypt, mask };
