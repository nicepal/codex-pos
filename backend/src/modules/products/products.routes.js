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
router.get('/:id/bundle-items', authorize('business.products'), requireFeature('catalog_pro'), controller.getBundleItems);
router.put('/:id/bundle-items', authorize('business.products'), requireFeature('catalog_pro'), controller.setBundleItems);
router.get('/:id/serials', authorize('business.products'), requireFeature('catalog_pro'), controller.listSerials);
router.post('/:id/serials', authorize('business.products'), requireFeature('catalog_pro'), controller.addSerial);
router.delete('/:id/serials/:serialId', authorize('business.products'), requireFeature('catalog_pro'), controller.removeSerial);
router.get('/:id/batches', authorize('business.products'), requireFeature('catalog_pro'), controller.listBatches);
router.post('/:id/batches', authorize('business.products'), requireFeature('catalog_pro'), controller.addBatch);
router.delete('/:id/batches/:batchId', authorize('business.products'), requireFeature('catalog_pro'), controller.removeBatch);
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
