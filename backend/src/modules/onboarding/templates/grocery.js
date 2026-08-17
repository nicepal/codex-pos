const { product } = require('./_helpers');

module.exports = {
  type: 'grocery',
  categories: [
    {
      name: 'Dairy & Eggs',
      slug: 'dairy',
      products: [
        product({ name: 'Whole Milk 1L', code: 'MILK01', sale_price: 2.49, cost_price: 1.4 }),
        product({ name: 'Free Range Eggs (12)', code: 'EGG01', sale_price: 4.29, cost_price: 2.5 }),
        product({ name: 'Greek Yogurt 500g', code: 'GYOG01', sale_price: 3.99, cost_price: 2.1 }),
      ],
    },
    {
      name: 'Bakery',
      slug: 'bakery',
      products: [
        product({ name: 'White Bread Loaf', code: 'BRD01', sale_price: 2.29, cost_price: 1.1 }),
        product({ name: 'Whole Wheat Tortillas', code: 'TOR01', sale_price: 3.49, cost_price: 1.6 }),
        product({ name: 'Bagels (6-pack)', code: 'BAG01', sale_price: 4.99, cost_price: 2.2 }),
      ],
    },
    {
      name: 'Pantry',
      slug: 'pantry',
      products: [
        product({ name: 'Pasta 500g', code: 'PASTA01', sale_price: 1.99, cost_price: 0.9 }),
        product({ name: 'Rice 1kg', code: 'RICE01', sale_price: 3.49, cost_price: 1.8 }),
        product({ name: 'Olive Oil 500ml', code: 'OIL01', sale_price: 8.99, cost_price: 4.5 }),
      ],
    },
    {
      name: 'Beverages',
      slug: 'beverages',
      products: [
        product({ name: 'Sparkling Water (6-pack)', code: 'SPW01', sale_price: 5.49, cost_price: 2.8 }),
        product({ name: 'Orange Juice 1L', code: 'OJC01', sale_price: 3.79, cost_price: 1.9 }),
        product({ name: 'Green Tea Boxes', code: 'TEA01', sale_price: 4.29, cost_price: 2 }),
      ],
    },
  ],
};
