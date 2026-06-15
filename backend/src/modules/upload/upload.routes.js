const router = require('express').Router();
const controller = require('./upload.controller');
const { upload } = require('../../middleware/upload');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');

router.use(authenticate, requireTenant, requireTenantAccess);

router.post('/image', authorize('business.products', 'business.settings'), upload.single('file'), controller.uploadImage);
router.post('/logo', authorize('business.settings'), upload.single('file'), controller.uploadLogo);

module.exports = router;
