const { Joi } = require('../../middleware/validate');

const createCustomerSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  email: Joi.string().email().allow('', null).optional(),
  phone: Joi.string().max(50).allow('', null).optional(),
  address: Joi.string().max(500).allow('', null).optional(),
  notes: Joi.string().max(2000).allow('', null).optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
  tax_exempt: Joi.boolean().optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
});

const updateCustomerSchema = createCustomerSchema.fork(['name'], (s) => s.optional());

module.exports = { createCustomerSchema, updateCustomerSchema };
