const { Joi } = require('../../middleware/validate');

const createBranchSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  code: Joi.string().max(50).allow('', null).optional(),
  phone: Joi.string().max(50).allow('', null).optional(),
  email: Joi.string().email().allow('', null).optional(),
  address: Joi.string().max(500).allow('', null).optional(),
  is_primary: Joi.boolean().optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
});

const updateBranchSchema = createBranchSchema.fork(['name'], (s) => s.optional());

module.exports = { createBranchSchema, updateBranchSchema };
