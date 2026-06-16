const router = require('express').Router();
const controller = require('./coupons.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');

router.use(authenticate, requireTenant, requireTenantAccess, requireFeature('catalog_pro'));

router.get('/', authorize('business.products'), controller.list);
router.post('/validate', authorize('business.pos', 'business.orders'), controller.validate);
router.get('/:id', authorize('business.products'), controller.getById);
router.post('/', authorize('business.products'), controller.create);
router.put('/:id', authorize('business.products'), controller.update);
router.delete('/:id', authorize('business.products'), controller.remove);

module.exports = router;
