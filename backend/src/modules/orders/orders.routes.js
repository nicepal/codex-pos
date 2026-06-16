const router = require('express').Router();
const controller = require('./orders.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { auditLog } = require('../../middleware/audit');
const { validate } = require('../../middleware/validate');
const { requireFeature } = require('../../middleware/features');
const { createOrderSchema, resumeOrderSchema, returnOrderSchema } = require('./orders.validation');

router.use(authenticate, requireTenant, requireTenantAccess);

router.get('/held', authorize('business.pos'), controller.held);
router.get('/', authorize('business.orders', 'business.pos'), controller.list);
router.get('/:id/receipt', authorize('business.orders', 'business.pos'), controller.receipt);
router.get('/:id', authorize('business.orders', 'business.pos'), controller.getById);
router.post('/', authorize('business.pos'), validate(createOrderSchema), auditLog('order.create', 'order'), controller.create);
router.post('/hold', authorize('business.pos'), validate(createOrderSchema), auditLog('order.hold', 'order'), controller.hold);
router.post('/:id/restore', authorize('business.pos'), auditLog('order.restore', 'order'), controller.restore);
router.post('/:id/resume', authorize('business.pos'), validate(resumeOrderSchema), auditLog('order.resume', 'order'), controller.resume);
router.post('/:id/return', authorize('business.orders', 'business.pos'), requireFeature('pos_pro'), validate(returnOrderSchema), auditLog('order.return', 'order'), controller.returnOrder);
router.patch('/:id/status', authorize('business.orders'), controller.updateStatus);

module.exports = router;
