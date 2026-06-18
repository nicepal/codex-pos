const Joi = require('joi');

const connectSchema = Joi.object({
  shop_url: Joi.string().trim().max(255).required(),
  access_token: Joi.string().trim().min(10).max(255).required(),
});

const importSettingsSchema = Joi.object({
  importVariants: Joi.boolean().optional(),
  importImages: Joi.boolean().optional(),
  importInventory: Joi.boolean().optional(),
  importCollections: Joi.boolean().optional(),
  createMissingCategories: Joi.boolean().optional(),
  updateExisting: Joi.boolean().optional(),
}).optional();

const importSchema = Joi.object({
  type: Joi.string().valid('full', 'incremental').default('full'),
  settings: importSettingsSchema,
});

module.exports = { connectSchema, importSchema };
