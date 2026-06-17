const router = require('express').Router();
const controller = require('./coupons.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');
const { validate } = require('../../middleware/validate');
const { createCouponSchema, updateCouponSchema } = require('./coupons.validation');

router.use(authenticate, requireTenant, requireTenantAccess, requireFeature('catalog_pro'));

router.get('/', authorize('business.products'), controller.list);
router.post('/validate', authorize('business.pos', 'business.orders'), controller.validate);
router.get('/:id', authorize('business.products'), controller.getById);
router.post('/', authorize('business.products'), validate(createCouponSchema), controller.create);
router.put('/:id', authorize('business.products'), validate(updateCouponSchema), controller.update);
router.delete('/:id', authorize('business.products'), controller.remove);

module.exports = router;
