const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

function ensureUploadDir(subfolder = '') {
  const dir = path.join(UPLOAD_DIR, subfolder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function normalizePath(relativePath) {
  return relativePath.replace(/\\/g, '/');
}

function signMediaPath(relativePath) {
  const normalized = normalizePath(relativePath);
  const expires = Math.floor(Date.now() / 1000) + config.upload.urlTtlSeconds;
  const payload = `${normalized}:${expires}`;
  const sig = crypto
    .createHmac('sha256', config.upload.signingSecret)
    .update(payload)
    .digest('hex');
  return { expires, sig };
}

function verifySignedMediaPath(relativePath, expires, sig) {
  if (!relativePath || !expires || !sig) return false;
  const exp = parseInt(expires, 10);
  if (!exp || exp < Math.floor(Date.now() / 1000)) return false;

  const normalized = normalizePath(relativePath);
  const payload = `${normalized}:${exp}`;
  const expected = crypto
    .createHmac('sha256', config.upload.signingSecret)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
  } catch {
    return false;
  }
}

function isPublicCatalogPath(relativePath) {
  return /^tenants\/[^/]+\/(products|logo)\//.test(normalizePath(relativePath));
}

function getPublicUrl(relativePath) {
  const normalized = normalizePath(relativePath);
  const { expires, sig } = signMediaPath(normalized);
  return `${config.apiPrefix}/media/${normalized}?expires=${expires}&sig=${sig}`;
}

async function saveLocal(file, subfolder = 'general') {
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const filename = `${uuidv4()}${ext}`;
  const relativePath = path.join(subfolder, filename);
  const fullPath = path.join(ensureUploadDir(subfolder), filename);

  if (file.buffer) {
    fs.writeFileSync(fullPath, file.buffer);
  } else if (file.path) {
    fs.renameSync(file.path, fullPath);
  }

  return {
    url: getPublicUrl(relativePath),
    path: relativePath,
    filename,
    size: file.size,
    mimetype: file.mimetype,
  };
}

async function saveFile(file, options = {}) {
  const subfolder = options.subfolder || 'general';

  if (config.storage?.provider === 's3' && config.storage?.bucket && config.storage?.accessKey) {
    try {
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const filename = `${uuidv4()}${ext}`;
      const key = path.join(subfolder, filename).replace(/\\/g, '/');
      const client = new S3Client({
        region: config.storage.region,
        credentials: { accessKeyId: config.storage.accessKey, secretAccessKey: config.storage.secretKey },
      });
      await client.send(new PutObjectCommand({
        Bucket: config.storage.bucket,
        Key: key,
        Body: file.buffer || fs.readFileSync(file.path),
        ContentType: file.mimetype,
      }));
      return { url: `${config.storage.publicUrl}/${key}`, path: key, filename, size: file.size, mimetype: file.mimetype };
    } catch {
      return saveLocal(file, subfolder);
    }
  }

  return saveLocal(file, subfolder);
}

async function deleteFile(relativePath) {
  const fullPath = path.join(UPLOAD_DIR, relativePath);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
}

function resolveMediaFilePath(relativePath) {
  const normalized = normalizePath(relativePath);
  const fullPath = path.normalize(path.join(UPLOAD_DIR, normalized));
  if (!fullPath.startsWith(UPLOAD_DIR)) return null;
  return fullPath;
}

module.exports = {
  saveFile,
  deleteFile,
  getPublicUrl,
  signMediaPath,
  verifySignedMediaPath,
  isPublicCatalogPath,
  resolveMediaFilePath,
  UPLOAD_DIR,
};
