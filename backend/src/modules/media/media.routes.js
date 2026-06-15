const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const {
  verifySignedMediaPath,
  isPublicCatalogPath,
  resolveMediaFilePath,
} = require('../../services/upload.service');

function serveMedia(req, res) {
  const relativePath = req.params[0];
  if (!relativePath) {
    return res.status(400).json({ success: false, message: 'File path required' });
  }

  const { expires, sig } = req.query;
  const signed = verifySignedMediaPath(relativePath, expires, sig);
  const legacyPublic = !expires && !sig && isPublicCatalogPath(relativePath);

  if (!signed && !legacyPublic) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Access denied' });
  }

  const fullPath = resolveMediaFilePath(relativePath);
  if (!fullPath || !fs.existsSync(fullPath)) {
    return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'File not found' });
  }

  const ext = path.extname(fullPath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };

  res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', signed ? 'private, max-age=3600' : 'public, max-age=300');
  return res.sendFile(fullPath);
}

router.get('/*', serveMedia);

module.exports = router;
