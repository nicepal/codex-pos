/**
 * Test data factories for API/integration tests
 */
const { v4: uuidv4 } = require('uuid');

function tenant(overrides = {}) {
  return {
    id: uuidv4(),
    name: 'Test Business',
    slug: `test-${Date.now()}`,
    status: 'active',
    ...overrides,
  };
}

function product(overrides = {}) {
  return {
    name: 'Test Product',
    sku: `SKU-${Date.now()}`,
    sale_price: 19.99,
    cost_price: 10,
    stock_quantity: 100,
    status: 'active',
    ...overrides,
  };
}

function orderItem(overrides = {}) {
  return {
    product_id: uuidv4(),
    product_name: 'Test Product',
    sku: 'SKU-1',
    quantity: 1,
    unit_price: 19.99,
    tax: 0,
    ...overrides,
  };
}

function posOrderPayload(overrides = {}) {
  return {
    items: [orderItem()],
    payment_method: 'cash',
    discount_amount: 0,
    tax_amount: 0,
    status: 'paid',
    ...overrides,
  };
}

module.exports = { tenant, product, orderItem, posOrderPayload };
