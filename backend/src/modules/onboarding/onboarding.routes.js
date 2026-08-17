const router = require('express').Router();
const controller = require('./onboarding.controller');
const { authenticate, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { auditLog } = require('../../middleware/audit');
const { validate } = require('../../middleware/validate');
const Joi = require('joi');

const selectTypeSchema = Joi.object({
  business_type: Joi.string()
    .valid(
      'retail', 'restaurant', 'grocery', 'fashion', 'electronics',
      'beauty', 'pharmacy', 'wholesale', 'general'
    )
    .required(),
});

router.use(authenticate, requireTenant, requireTenantAccess);

router.get('/business-types', controller.listBusinessTypes);
router.get('/status', controller.getStatus);
router.post(
  '/select-business-type',
  validate(selectTypeSchema),
  auditLog('onboarding.select_type', 'onboarding'),
  controller.selectBusinessType
);
router.post(
  '/setup',
  auditLog('onboarding.setup', 'onboarding'),
  controller.setup
);
router.post(
  '/skip',
  auditLog('onboarding.skip', 'onboarding'),
  controller.skip
);

module.exports = router;
