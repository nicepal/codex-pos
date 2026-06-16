const { Joi } = require('../../middleware/validate');

const createProductSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  slug: Joi.string().max(255).optional(),
  sku: Joi.string().max(100).allow('', null).optional(),
  barcode: Joi.string().max(100).allow('', null).optional(),
  description: Joi.string().max(5000).allow('', null).optional(),
  category_id: Joi.string().uuid().allow(null).optional(),
  brand_id: Joi.string().uuid().allow(null).optional(),
  branch_id: Joi.string().uuid().allow(null).optional(),
  product_type: Joi.string().valid('simple', 'variable').optional(),
  cost_price: Joi.number().min(0).optional(),
  sale_price: Joi.number().min(0).required(),
  stock_quantity: Joi.number().integer().min(0).optional(),
  low_stock_threshold: Joi.number().integer().min(0).optional(),
  status: Joi.string().valid('active', 'inactive', 'draft').optional(),
  meta_title: Joi.string().max(255).allow('', null).optional(),
  meta_description: Joi.string().max(500).allow('', null).optional(),
  variants: Joi.array().optional(),
});

const updateProductSchema = createProductSchema.fork(['name', 'sale_price'], (s) => s.optional());

module.exports = { createProductSchema, updateProductSchema };
