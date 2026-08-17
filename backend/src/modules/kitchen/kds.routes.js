const router = require('express').Router();
const controller = require('./kds.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');
const { validate } = require('../../middleware/validate');
const { auditLog } = require('../../middleware/audit');
const Joi = require('joi');

const branchQuerySchema = Joi.object({
  branch_id: Joi.string().uuid().optional(),
  status: Joi.string().valid('pending', 'accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled').optional(),
  station_id: Joi.string().uuid().optional(),
  active_only: Joi.string().valid('true', 'false').optional(),
});

const prioritySchema = Joi.object({
  priority: Joi.number().integer().min(0).max(99).required(),
  branch_id: Joi.string().uuid().optional(),
});

const stationSchema = Joi.object({
  branch_id: Joi.string().uuid().required(),
  name: Joi.string().trim().max(120).required(),
  description: Joi.string().max(500).allow('', null).optional(),
  display_order: Joi.number().integer().min(0).default(0),
  is_active: Joi.boolean().default(true),
});

const updateStationSchema = stationSchema.fork(['branch_id', 'name'], (s) => s.optional());

router.use(
  authenticate,
  requireTenant,
  requireTenantAccess,
  requireFeature('restaurant_pro')
);

router.get(
  '/tickets',
  authorize('kds.view', 'kds.manage', 'restaurant.manage'),
  validate(branchQuerySchema, 'query'),
  controller.listTickets
);
router.get(
  '/tickets/:id',
  authorize('kds.view', 'kds.manage', 'restaurant.manage'),
  controller.getTicket
);
router.post(
  '/tickets/:id/accept',
  authorize('kds.manage', 'restaurant.manage'),
  auditLog('kitchen.ticket.accepted', 'kitchen_ticket'),
  controller.acceptTicket
);
router.post(
  '/tickets/:id/start',
  authorize('kds.manage', 'restaurant.manage'),
  auditLog('kitchen.ticket.started', 'kitchen_ticket'),
  controller.startTicket
);
router.post(
  '/tickets/:id/ready',
  authorize('kds.manage', 'restaurant.manage'),
  auditLog('kitchen.ticket.ready', 'kitchen_ticket'),
  controller.readyTicket
);
router.post(
  '/tickets/:id/complete',
  authorize('kds.manage', 'restaurant.manage'),
  auditLog('kitchen.ticket.completed', 'kitchen_ticket'),
  controller.completeTicket
);
router.post(
  '/tickets/:id/cancel',
  authorize('kds.manage', 'restaurant.manage'),
  auditLog('kitchen.ticket.cancelled', 'kitchen_ticket'),
  controller.cancelTicket
);
router.post(
  '/tickets/:id/recall',
  authorize('kds.manage', 'restaurant.manage'),
  auditLog('kitchen.ticket.recalled', 'kitchen_ticket'),
  controller.recallTicket
);
router.post(
  '/tickets/:id/priority',
  authorize('kds.manage', 'restaurant.manage'),
  validate(prioritySchema),
  controller.setPriority
);

router.get(
  '/stations',
  authorize('kds.view', 'kds.manage', 'restaurant.manage', 'restaurant.settings.manage'),
  validate(branchQuerySchema, 'query'),
  controller.listStations
);
router.post(
  '/stations',
  authorize('restaurant.settings.manage', 'restaurant.manage'),
  validate(stationSchema),
  auditLog('kitchen.station.create', 'kitchen_station'),
  controller.createStation
);
router.put(
  '/stations/:id',
  authorize('restaurant.settings.manage', 'restaurant.manage'),
  validate(updateStationSchema),
  auditLog('kitchen.station.update', 'kitchen_station'),
  controller.updateStation
);
router.delete(
  '/stations/:id',
  authorize('restaurant.settings.manage', 'restaurant.manage'),
  auditLog('kitchen.station.delete', 'kitchen_station'),
  controller.deleteStation
);

module.exports = router;
