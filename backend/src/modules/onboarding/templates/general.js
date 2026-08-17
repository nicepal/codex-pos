const { product } = require('./_helpers');

module.exports = {
  type: 'general',
  categories: [
    {
      name: 'Starter Products',
      slug: 'starter',
      products: [
        product({ name: 'Standard Item A', code: 'GENA01', sale_price: 19.99, cost_price: 8 }),
        product({ name: 'Standard Item B', code: 'GENB01', sale_price: 29.99, cost_price: 12 }),
        product({ name: 'Standard Item C', code: 'GENC01', sale_price: 14.5, cost_price: 5.5 }),
        product({ name: 'Service Fee Item', code: 'SERV01', sale_price: 10.0, cost_price: 0, stock: 100 }),
      ],
    },
    {
      name: 'Supplies',
      slug: 'supplies',
      products: [
        product({ name: 'Packaging Kit', code: 'PKG01', sale_price: 12.99, cost_price: 4 }),
        product({ name: 'Receipt Paper Roll', code: 'RCPT01', sale_price: 6.99, cost_price: 2.5 }),
        product({ name: 'Price Tags (100)', code: 'TAG01', sale_price: 8.5, cost_price: 3 }),
      ],
    },
    {
      name: 'Add-ons',
      slug: 'addons',
      products: [
        product({ name: 'Gift Bag', code: 'GBAG01', sale_price: 3.99, cost_price: 1 }),
        product({ name: 'Warranty Card', code: 'WAR01', sale_price: 4.99, cost_price: 0.5 }),
        product({ name: 'Membership Card', code: 'MEM01', sale_price: 5.0, cost_price: 1 }),
      ],
    },
  ],
};
