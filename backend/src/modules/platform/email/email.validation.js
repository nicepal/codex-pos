const Joi = require('joi');

const smtpSchema = Joi.object({
  host: Joi.string().trim().max(255).required(),
  port: Joi.number().integer().min(1).max(65535).required(),
  username: Joi.string().trim().max(255).allow('', null),
  password: Joi.string().max(500).allow('', null),
  encryption: Joi.string().valid('ssl', 'tls', 'none').required(),
  from_email: Joi.string().email().required(),
  from_name: Joi.string().trim().max(255).allow('', null),
  reply_to_email: Joi.string().email().allow('', null),
  is_enabled: Joi.boolean().optional(),
});

const testSchema = Joi.object({
  test_email: Joi.string().email().required(),
  // Optional inline config to test before saving
  host: Joi.string().trim().max(255).optional(),
  port: Joi.number().integer().min(1).max(65535).optional(),
  username: Joi.string().trim().max(255).allow('', null).optional(),
  password: Joi.string().max(500).allow('', null).optional(),
  encryption: Joi.string().valid('ssl', 'tls', 'none').optional(),
  from_email: Joi.string().email().optional(),
  from_name: Joi.string().trim().max(255).allow('', null).optional(),
  reply_to_email: Joi.string().email().allow('', null).optional(),
});

const templateSchema = Joi.object({
  name: Joi.string().trim().max(255).required(),
  subject: Joi.string().trim().max(255).required(),
  body_html: Joi.string().required(),
  body_text: Joi.string().allow('', null),
  status: Joi.string().valid('active', 'inactive').optional(),
});

const previewSchema = Joi.object({
  subject: Joi.string().allow('', null),
  body_html: Joi.string().allow('', null),
  variables: Joi.object().optional(),
});

const sendTestSchema = Joi.object({
  test_email: Joi.string().email().required(),
  slug: Joi.string().trim().max(100).optional(),
  variables: Joi.object().optional(),
});

module.exports = { smtpSchema, testSchema, templateSchema, previewSchema, sendTestSchema };
