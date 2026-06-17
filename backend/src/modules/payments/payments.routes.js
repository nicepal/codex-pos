const router = require('express').Router();
const controller = require('./payments.controller');
const { authenticate, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validate');
const { Joi } = require('../../middleware/validate');

const checkoutSchema = Joi.object({
  plan_id: Joi.string().uuid().required(),
  billing_cycle: Joi.string().valid('monthly', 'annual').default('monthly'),
});

const confirmSchema = Joi.object({
  session_id: Joi.string().uuid().required(),
  payment_reference: Joi.string().max(255).optional(),
});

router.post(
  '/checkout',
  authenticate,
  requireTenant,
  requireTenantAccess,
  validate(checkoutSchema),
  controller.createCheckout
);

router.get(
  '/checkout/:id',
  authenticate,
  requireTenant,
  requireTenantAccess,
  controller.getCheckout
);

router.post(
  '/confirm',
  authenticate,
  requireTenant,
  requireTenantAccess,
  validate(confirmSchema),
  controller.confirmCheckout
);

router.get('/config', controller.publicConfig);

router.post('/webhook', controller.webhook);

module.exports = router;
