const Joi = require('joi');

const EXPENSE_CATEGORIES = [
  'Rent', 'Utilities', 'Salaries', 'Marketing', 'Supplies',
  'Maintenance', 'Transportation', 'Insurance', 'Other',
];

const createExpenseSchema = Joi.object({
  title: Joi.string().trim().max(255).required(),
  amount: Joi.number().positive().required(),
  category: Joi.string().valid(...EXPENSE_CATEGORIES).default('Other'),
  expense_date: Joi.alternatives().try(Joi.date(), Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)).required(),
  notes: Joi.string().allow('', null).optional(),
  supplier_id: Joi.string().uuid().allow(null).optional(),
  supplier_name: Joi.string().max(255).allow('', null).optional(),
  payment_method: Joi.string().valid('cash', 'card', 'bank', 'cheque', 'other').default('cash'),
  status: Joi.string().valid('pending', 'paid', 'approved', 'cancelled').default('paid'),
  receipt_url: Joi.string().uri().allow('', null).optional(),
});

const updateExpenseSchema = createExpenseSchema.fork(
  ['title', 'amount', 'expense_date'],
  (s) => s.optional()
);

const importExpenseSchema = Joi.object({
  rows: Joi.array().items(Joi.object({
    title: Joi.string().required(),
    amount: Joi.number().positive().required(),
    category: Joi.string().optional(),
    expense_date: Joi.alternatives().try(Joi.date(), Joi.string()).required(),
    supplier_name: Joi.string().allow('', null).optional(),
    payment_method: Joi.string().optional(),
    status: Joi.string().optional(),
    notes: Joi.string().allow('', null).optional(),
  })).min(1).required(),
});

module.exports = {
  EXPENSE_CATEGORIES,
  createExpenseSchema,
  updateExpenseSchema,
  importExpenseSchema,
};
