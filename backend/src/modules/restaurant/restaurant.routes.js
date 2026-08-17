const router = require('express').Router();
const controller = require('./restaurant.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');
const { validate } = require('../../middleware/validate');
const { auditLog } = require('../../middleware/audit');
const {
  branchQuerySchema,
  listTablesQuerySchema,
  floorSchema,
  updateFloorSchema,
  tableSchema,
  updateTableSchema,
  openSessionSchema,
  settingsSchema,
  sendKitchenSchema,
  appendItemsSchema,
} = require('./restaurant.validation');

router.use(
  authenticate,
  requireTenant,
  requireTenantAccess,
  requireFeature('restaurant_pro')
);

router.get(
  '/settings',
  authorize('restaurant.view', 'restaurant.settings.manage', 'restaurant.manage'),
  controller.getSettings
);
router.put(
  '/settings',
  authorize('restaurant.settings.manage', 'restaurant.manage'),
  validate(settingsSchema),
  controller.updateSettings
);

router.get(
  '/dashboard',
  authorize('restaurant.view', 'restaurant.manage', 'restaurant.tables.view'),
  validate(branchQuerySchema, 'query'),
  controller.dashboard
);

router.get(
  '/floors',
  authorize('restaurant.view', 'restaurant.tables.view', 'restaurant.manage'),
  validate(branchQuerySchema, 'query'),
  controller.listFloors
);
router.post(
  '/floors',
  authorize('restaurant.tables.manage', 'restaurant.manage'),
  validate(floorSchema),
  controller.createFloor
);
router.put(
  '/floors/:id',
  authorize('restaurant.tables.manage', 'restaurant.manage'),
  validate(updateFloorSchema),
  controller.updateFloor
);
router.delete(
  '/floors/:id',
  authorize('restaurant.tables.manage', 'restaurant.manage'),
  controller.deleteFloor
);

router.get(
  '/tables',
  authorize('restaurant.view', 'restaurant.tables.view', 'restaurant.manage'),
  validate(listTablesQuerySchema, 'query'),
  controller.listTables
);
router.post(
  '/tables',
  authorize('restaurant.tables.manage', 'restaurant.manage'),
  validate(tableSchema),
  controller.createTable
);
router.put(
  '/tables/:id',
  authorize('restaurant.tables.manage', 'restaurant.manage'),
  validate(updateTableSchema),
  controller.updateTable
);
router.delete(
  '/tables/:id',
  authorize('restaurant.tables.manage', 'restaurant.manage'),
  controller.deleteTable
);

router.get(
  '/tables/:id/session',
  authorize('restaurant.view', 'restaurant.tables.view', 'restaurant.manage'),
  controller.getSession
);
router.post(
  '/tables/:id/open',
  authorize('restaurant.tables.manage', 'restaurant.manage', 'business.pos'),
  validate(openSessionSchema),
  controller.openTable
);
router.post(
  '/tables/:id/close',
  authorize('restaurant.tables.manage', 'restaurant.manage', 'business.pos'),
  controller.closeTable
);
router.get(
  '/tables/:id/active-order',
  authorize('restaurant.view', 'restaurant.tables.view', 'restaurant.manage', 'business.pos'),
  controller.getActiveOrder
);

router.post(
  '/orders/:orderId/kitchen/send',
  authorize('restaurant.manage', 'business.pos'),
  validate(sendKitchenSchema),
  auditLog('kitchen.order.sent', 'order'),
  controller.sendOrderToKitchen
);

router.post(
  '/orders/:orderId/items',
  authorize('restaurant.manage', 'business.pos'),
  validate(appendItemsSchema),
  auditLog('restaurant.order.items.append', 'order'),
  controller.appendOrderItems
);

module.exports = router;
