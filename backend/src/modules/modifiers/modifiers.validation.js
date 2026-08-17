const Joi = require('joi');

const uuid = Joi.string().uuid();

const groupSchema = Joi.object({
  name: Joi.string().trim().max(120).required(),
  required: Joi.boolean().default(false),
  min_selections: Joi.number().integer().min(0).default(0),
  max_selections: Joi.number().integer().min(1).default(1),
  active: Joi.boolean().default(true),
});

const updateGroupSchema = groupSchema.fork(['name'], (s) => s.optional());

const optionSchema = Joi.object({
  name: Joi.string().trim().max(120).required(),
  price_delta: Joi.number().min(0).default(0),
  display_order: Joi.number().integer().min(0).default(0),
  active: Joi.boolean().default(true),
});

const updateOptionSchema = optionSchema.fork(['name'], (s) => s.optional());

const productModifiersSchema = Joi.object({
  modifier_group_ids: Joi.array().items(uuid).default([]),
});

module.exports = {
  groupSchema,
  updateGroupSchema,
  optionSchema,
  updateOptionSchema,
  productModifiersSchema,
};
