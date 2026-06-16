const router = require('express').Router();
const controller = require('./products.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { auditLog } = require('../../middleware/audit');
const { validate } = require('../../middleware/validate');
const { createProductSchema, updateProductSchema } = require('./products.validation');
const { requireFeature } = require('../../middleware/features');

const { upload } = require('../../middleware/upload');

router.use(authenticate, requireTenant, requireTenantAccess);

router.get('/search', authorize('business.products', 'business.pos'), controller.search);
router.get('/', authorize('business.products'), controller.list);
router.post('/bulk-delete', authorize('business.products'), auditLog('product.delete', 'product'), controller.bulkRemove);
router.get('/:id', authorize('business.products'), controller.getById);
router.post('/import', authorize('business.products'), requireFeature('catalog_pro'), controller.importCsv);
router.post('/', authorize('business.products'), auditLog('product.create', 'product'), validate(createProductSchema), controller.create);
router.post('/:id/images', authorize('business.products'), upload.single('file'), controller.uploadImage);
router.post('/:id/duplicate', authorize('business.products'), auditLog('product.create', 'product'), controller.duplicate);
router.delete('/:id/images/:imageId', authorize('business.products'), controller.removeImage);
router.delete('/:id/variants/:variantId', authorize('business.products'), controller.deleteVariant);
router.put('/:id', authorize('business.products'), auditLog('product.update', 'product'), validate(updateProductSchema), controller.update);
router.delete('/:id', authorize('business.products'), auditLog('product.delete', 'product'), controller.remove);

module.exports = router;
