const { Joi } = require('../../middleware/validate');

const registerSchema = Joi.object({
  businessName: Joi.string().min(2).max(255).required(),
  slug: Joi.string().min(2).max(100).pattern(/^[a-z0-9-]+$/).optional(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  firstName: Joi.string().min(1).max(100).required(),
  lastName: Joi.string().min(1).max(100).required(),
  phone: Joi.string().max(50).optional(),
  address: Joi.string().optional(),
  timezone: Joi.string().optional(),
  currency: Joi.string().length(3).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  tenantId: Joi.string().uuid().optional(),
  mfaToken: Joi.string().length(6).pattern(/^\d+$/).optional(),
});

const disableMfaSchema = Joi.object({
  password: Joi.string().required(),
  token: Joi.string().length(6).pattern(/^\d+$/).required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).max(128).required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  disableMfaSchema,
};
