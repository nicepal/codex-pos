const { Joi } = require('../../middleware/validate');

const createBusinessSchema = Joi.object({
  businessName: Joi.string().min(2).max(255).required(),
  slug: Joi.string().min(2).max(100).pattern(/^[a-z0-9-]+$/).optional(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  firstName: Joi.string().min(1).max(100).required(),
  lastName: Joi.string().min(1).max(100).required(),
  phone: Joi.string().max(50).optional().allow(''),
  address: Joi.string().optional().allow(''),
  timezone: Joi.string().optional(),
  currency: Joi.string().length(3).optional(),
  plan_id: Joi.string().uuid().optional(),
  trial_days: Joi.number().integer().min(0).max(365).optional(),
  status: Joi.string().valid('trial', 'active').optional(),
});

module.exports = { createBusinessSchema };
