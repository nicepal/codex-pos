const { product } = require('./_helpers');

module.exports = {
  type: 'wholesale',
  categories: [
    {
      name: 'Bulk Packs',
      slug: 'bulk',
      products: [
        product({ name: 'Paper Towels Case (12)', code: 'PTW01', sale_price: 28.0, cost_price: 16, stock: 40 }),
        product({ name: 'Trash Bags Case', code: 'BAGW01', sale_price: 32.5, cost_price: 18, stock: 40 }),
        product({ name: 'Copy Paper Ream (5)', code: 'PAP01', sale_price: 24.99, cost_price: 14, stock: 40 }),
      ],
    },
    {
      name: 'Cleaning Supplies',
      slug: 'cleaning',
      products: [
        product({ name: 'All-Purpose Cleaner (Case)', code: 'CLN01', sale_price: 36.0, cost_price: 20 }),
        product({ name: 'Disinfectant Spray (6)', code: 'DIS01', sale_price: 29.99, cost_price: 16 }),
        product({ name: 'Microfiber Cloths (50)', code: 'MFC01', sale_price: 22.5, cost_price: 10 }),
      ],
    },
    {
      name: 'Foodservice Packs',
      slug: 'foodservice',
      products: [
        product({ name: 'Disposable Cups (500)', code: 'CUP01', sale_price: 34.99, cost_price: 18 }),
        product({ name: 'Takeout Containers (100)', code: 'CNT01', sale_price: 27.5, cost_price: 14 }),
        product({ name: 'Napkins Case', code: 'NAP01', sale_price: 19.99, cost_price: 10 }),
      ],
    },
    {
      name: 'Office Basics',
      slug: 'office',
      products: [
        product({ name: 'Ballpoint Pens Box (50)', code: 'PEN01', sale_price: 14.99, cost_price: 6 }),
        product({ name: 'Sticky Notes Carton', code: 'STK01', sale_price: 16.5, cost_price: 7 }),
        product({ name: 'Shipping Tape (12 rolls)', code: 'TAPE01', sale_price: 21.99, cost_price: 10 }),
      ],
    },
  ],
};
