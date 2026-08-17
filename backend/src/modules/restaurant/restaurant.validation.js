const Joi = require('joi');
const { TABLE_STATUSES, TABLE_SHAPES } = require('./restaurant.helpers');

const uuid = Joi.string().uuid();

const branchQuerySchema = Joi.object({
  branch_id: uuid.optional(),
});

const listTablesQuerySchema = branchQuerySchema.keys({
  floor_id: uuid.optional(),
});

const floorSchema = Joi.object({
  branch_id: uuid.required(),
  name: Joi.string().trim().max(120).required(),
  sort_order: Joi.number().integer().min(0).default(0),
  active: Joi.boolean().default(true),
});

const updateFloorSchema = floorSchema.fork(['branch_id', 'name'], (s) => s.optional());

const tableSchema = Joi.object({
  branch_id: uuid.required(),
  floor_id: uuid.required(),
  name: Joi.string().trim().max(80).required(),
  capacity: Joi.number().integer().min(1).max(99).default(2),
  position_x: Joi.number().integer().min(0).default(0),
  position_y: Joi.number().integer().min(0).default(0),
  shape: Joi.string().valid(...TABLE_SHAPES).default('square'),
  status: Joi.string().valid(...TABLE_STATUSES).default('available'),
  active: Joi.boolean().default(true),
});

const updateTableSchema = tableSchema.fork(['branch_id', 'floor_id', 'name'], (s) => s.optional());

const openSessionSchema = Joi.object({
  employee_id: uuid.allow(null).optional(),
  guest_count: Joi.number().integer().min(1).max(99).default(2),
});

const settingsSchema = Joi.object({
  show_capacity_on_floor_plan: Joi.boolean().optional(),
  default_guest_count: Joi.number().integer().min(1).max(99).optional(),
  post_close_table_status: Joi.string().valid('available', 'cleaning').optional(),
  enable_reservations: Joi.boolean().optional(),
  default_floor_id: uuid.allow(null).optional(),
  kitchen_enabled: Joi.boolean().optional(),
  default_station_id: uuid.allow(null).optional(),
  warning_after_minutes: Joi.number().integer().min(1).max(120).optional(),
  overdue_after_minutes: Joi.number().integer().min(1).max(240).optional(),
  sound_enabled: Joi.boolean().optional(),
  auto_refresh_seconds: Joi.number().integer().min(5).max(300).optional(),
});

const sendKitchenSchema = Joi.object({
  item_ids: Joi.array().items(Joi.string().uuid()).optional(),
  branch_id: Joi.string().uuid().optional(),
});

const appendItemsSchema = Joi.object({
  items: Joi.array().items(Joi.object({
    product_id: Joi.string().uuid().required(),
    product_name: Joi.string().required(),
    variant_id: Joi.string().uuid().allow(null).optional(),
    quantity: Joi.number().integer().min(1).required(),
    unit_price: Joi.number().min(0).required(),
    discount: Joi.number().min(0).default(0),
    selected_modifiers: Joi.array().optional(),
    item_notes: Joi.string().max(500).allow('', null).optional(),
    sku: Joi.string().allow('', null).optional(),
  })).min(1).required(),
});

module.exports = {
  branchQuerySchema,
  listTablesQuerySchema,
  floorSchema,
  updateFloorSchema,
  tableSchema,
  updateTableSchema,
  openSessionSchema,
  settingsSchema,
  sendKitchenSchema,
  appendItemsSchema,
};
