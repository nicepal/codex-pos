const router = require('express').Router();
const controller = require('./modifiers.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');
const { validate } = require('../../middleware/validate');
const {
  groupSchema,
  updateGroupSchema,
  optionSchema,
  updateOptionSchema,
  productModifiersSchema,
} = require('./modifiers.validation');

router.use(
  authenticate,
  requireTenant,
  requireTenantAccess,
  requireFeature('restaurant_pro')
);

router.get(
  '/groups',
  authorize('restaurant.view', 'restaurant.manage', 'business.products'),
  controller.listGroups
);
router.get(
  '/groups/:id',
  authorize('restaurant.view', 'restaurant.manage', 'business.products'),
  controller.getGroup
);
router.post(
  '/groups',
  authorize('restaurant.manage', 'business.products'),
  validate(groupSchema),
  controller.createGroup
);
router.put(
  '/groups/:id',
  authorize('restaurant.manage', 'business.products'),
  validate(updateGroupSchema),
  controller.updateGroup
);
router.delete(
  '/groups/:id',
  authorize('restaurant.manage', 'business.products'),
  controller.deleteGroup
);

router.post(
  '/groups/:groupId/options',
  authorize('restaurant.manage', 'business.products'),
  validate(optionSchema),
  controller.createOption
);
router.put(
  '/options/:id',
  authorize('restaurant.manage', 'business.products'),
  validate(updateOptionSchema),
  controller.updateOption
);
router.delete(
  '/options/:id',
  authorize('restaurant.manage', 'business.products'),
  controller.deleteOption
);

router.get(
  '/products/:productId',
  authorize('business.pos', 'restaurant.view', 'restaurant.manage', 'business.products'),
  controller.getProductModifiers
);
router.put(
  '/products/:productId',
  authorize('restaurant.manage', 'business.products'),
  validate(productModifiersSchema),
  controller.setProductModifiers
);

module.exports = router;
