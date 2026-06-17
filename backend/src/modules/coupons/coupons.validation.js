const Joi = require('joi');

const createCouponSchema = Joi.object({
  code: Joi.string().trim().max(50).required(),
  discount_type: Joi.string().valid('percent', 'fixed').required(),
  discount_value: Joi.number().positive().required(),
  min_order_amount: Joi.number().min(0).optional().allow(null),
  max_uses: Joi.number().integer().min(1).optional().allow(null),
  starts_at: Joi.date().iso().optional().allow(null, ''),
  expires_at: Joi.date().iso().optional().allow(null, ''),
  status: Joi.string().valid('active', 'inactive').optional(),
});

const updateCouponSchema = createCouponSchema.fork(['code', 'discount_type', 'discount_value'], (s) => s.optional());

module.exports = { createCouponSchema, updateCouponSchema };
