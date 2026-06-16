const { Joi } = require('../../middleware/validate');

const orderItemSchema = Joi.object({
  product_id: Joi.string().uuid().optional(),
  variant_id: Joi.string().uuid().optional(),
  product_name: Joi.string().optional(),
  sku: Joi.string().allow('', null).optional(),
  quantity: Joi.number().integer().min(1).required(),
  unit_price: Joi.number().min(0).optional(),
  discount: Joi.number().min(0).optional(),
  tax: Joi.number().min(0).optional(),
}).or('product_id', 'variant_id');

const createOrderSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).required(),
  customer_id: Joi.string().uuid().allow(null).optional(),
  employee_id: Joi.string().uuid().allow(null).optional(),
  branch_id: Joi.string().uuid().allow(null).optional(),
  order_type: Joi.string().valid('pos', 'online', 'phone').optional(),
  status: Joi.string().valid('pending', 'paid', 'completed', 'on_hold', 'cancelled').optional(),
  payment_method: Joi.string().valid('cash', 'card', 'bank', 'other').allow(null).optional(),
  discount_amount: Joi.number().min(0).optional(),
  tax_amount: Joi.number().min(0).optional(),
  notes: Joi.string().max(2000).allow('', null).optional(),
  payments: Joi.array().items(Joi.object({
    method: Joi.string().valid('cash', 'card', 'bank', 'other').required(),
    amount: Joi.number().min(0).required(),
    reference: Joi.string().allow('', null).optional(),
  })).optional(),
});

const checkoutSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).required(),
  customer_name: Joi.string().min(1).max(255).required(),
  customer_email: Joi.string().email().allow('', null).optional(),
  customer_phone: Joi.string().max(50).allow('', null).optional(),
  payment_method: Joi.string().valid('cash', 'card', 'bank', 'other').optional(),
  notes: Joi.string().max(2000).allow('', null).optional(),
});

const resumeOrderSchema = Joi.object({
  payment_method: Joi.string().valid('cash', 'card', 'bank', 'other').required(),
});

const returnItemSchema = Joi.object({
  order_item_id: Joi.string().uuid().required(),
  quantity: Joi.number().integer().min(1).required(),
});

const returnOrderSchema = Joi.object({
  items: Joi.array().items(returnItemSchema).min(1).required(),
  reason: Joi.string().max(500).allow('', null).optional(),
  restock: Joi.boolean().optional(),
});

module.exports = {
  createOrderSchema,
  checkoutSchema,
  resumeOrderSchema,
  returnOrderSchema,
};
