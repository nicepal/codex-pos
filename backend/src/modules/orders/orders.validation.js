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
  selected_modifiers: Joi.array().items(Joi.string().uuid()).optional(),
  item_notes: Joi.string().max(500).allow('', null).optional(),
  order_item_id: Joi.string().uuid().optional(),
  voided: Joi.boolean().optional(),
  void_reason: Joi.string().max(200).allow('', null).optional(),
}).or('product_id', 'variant_id');

const createOrderSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).required(),
  customer_id: Joi.string().uuid().allow(null).optional(),
  employee_id: Joi.string().uuid().allow(null).optional(),
  branch_id: Joi.string().uuid().allow(null).optional(),
  order_type: Joi.string().valid('pos', 'online', 'phone').optional(),
  status: Joi.string().valid('pending', 'paid', 'completed', 'on_hold', 'cancelled').optional(),
  payment_method: Joi.string().valid('cash', 'card', 'bank', 'gift_card', 'other').allow(null).optional(),
  discount_amount: Joi.number().min(0).optional(),
  tip_amount: Joi.number().min(0).optional(),
  coupon_code: Joi.string().max(60).allow('', null).optional(),
  payment_intent_id: Joi.string().max(255).allow('', null).optional(),
  client_order_id: Joi.string().max(64).allow('', null).optional(),
  manager_employee_id: Joi.string().uuid().allow(null).optional(),
  manager_pin: Joi.string().max(20).allow(null).optional(),
  tax_amount: Joi.number().min(0).optional(),
  notes: Joi.string().max(2000).allow('', null).optional(),
  fulfillment_type: Joi.string().valid('delivery', 'pickup').optional(),
  pickup_branch_id: Joi.string().uuid().allow(null).optional(),
  loyalty_points_to_redeem: Joi.number().integer().min(0).optional(),
  payments: Joi.array().items(Joi.object({
    method: Joi.string().valid('cash', 'card', 'bank', 'gift_card', 'loyalty', 'other').required(),
    amount: Joi.number().min(0).required(),
    code: Joi.string().max(40).allow('', null).optional(),
    reference: Joi.string().allow('', null).optional(),
  })).optional(),
  dining_order_type: Joi.string().valid('dine_in', 'takeaway', 'delivery').allow(null).optional(),
  dining_session_id: Joi.string().uuid().allow(null).optional(),
  table_id: Joi.string().uuid().allow(null).optional(),
  guest_count: Joi.number().integer().min(1).max(99).allow(null).optional(),
  server_employee_id: Joi.string().uuid().allow(null).optional(),
  send_to_kitchen: Joi.boolean().optional(),
});

const checkoutSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).required(),
  customer_name: Joi.string().min(1).max(255).required(),
  customer_email: Joi.string().email().required(),
  customer_phone: Joi.string().max(50).allow('', null).optional(),
  shipping_address: Joi.object({
    line1: Joi.string().max(255).allow('', null).optional(),
    line2: Joi.string().max(255).allow('', null).optional(),
    city: Joi.string().max(100).allow('', null).optional(),
    postal_code: Joi.string().max(32).allow('', null).optional(),
    country: Joi.string().max(100).allow('', null).optional(),
  }).optional(),
  fulfillment_type: Joi.string().valid('delivery', 'pickup').optional(),
  pickup_branch_id: Joi.when('fulfillment_type', {
    is: 'pickup',
    then: Joi.string().uuid().required().messages({
      'any.required': 'Pickup location is required',
      'string.empty': 'Pickup location is required',
    }),
    otherwise: Joi.string().uuid().allow(null, '').optional(),
  }),
  payment_method: Joi.string().valid('cash', 'card', 'bank', 'other').optional(),
  notes: Joi.string().max(2000).allow('', null).optional(),
  coupon_code: Joi.string().max(64).allow('', null).optional(),
  gift_card_code: Joi.string().max(64).allow('', null).optional(),
  loyalty_points_to_redeem: Joi.number().integer().min(0).optional(),
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
  manager_employee_id: Joi.string().uuid().allow(null).optional(),
  manager_pin: Joi.string().max(20).allow(null).optional(),
});

module.exports = {
  createOrderSchema,
  checkoutSchema,
  resumeOrderSchema,
  returnOrderSchema,
};
