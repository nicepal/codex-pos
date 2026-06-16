const { Joi } = require('../../middleware/validate');

const inviteTeamSchema = Joi.object({
  email: Joi.string().email().required(),
  first_name: Joi.string().max(100).allow('', null).optional(),
  last_name: Joi.string().max(100).allow('', null).optional(),
  phone: Joi.string().max(50).allow('', null).optional(),
  password: Joi.string().min(8).optional(),
  role: Joi.string().valid('manager', 'cashier').optional(),
});

const updateRoleSchema = Joi.object({
  role: Joi.string().valid('manager', 'cashier').required(),
});

module.exports = { inviteTeamSchema, updateRoleSchema };
