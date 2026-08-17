const { product } = require('./_helpers');

module.exports = {
  type: 'beauty',
  categories: [
    {
      name: 'Skincare',
      slug: 'skincare',
      products: [
        product({ name: 'Gentle Face Cleanser', code: 'CLN01', sale_price: 16.99, cost_price: 6 }),
        product({ name: 'Daily Moisturizer', code: 'MOI01', sale_price: 22.5, cost_price: 8 }),
        product({ name: 'SPF 30 Sunscreen', code: 'SPF01', sale_price: 18.99, cost_price: 7 }),
      ],
    },
    {
      name: 'Haircare',
      slug: 'haircare',
      products: [
        product({ name: 'Hydrating Shampoo', code: 'SHAM01', sale_price: 14.99, cost_price: 5 }),
        product({ name: 'Conditioner', code: 'COND01', sale_price: 14.99, cost_price: 5 }),
        product({ name: 'Hair Oil Serum', code: 'OILH01', sale_price: 19.99, cost_price: 7 }),
      ],
    },
    {
      name: 'Body Care',
      slug: 'body',
      products: [
        product({ name: 'Body Lotion', code: 'LOT01', sale_price: 12.99, cost_price: 4.5 }),
        product({ name: 'Hand Cream', code: 'HAND01', sale_price: 9.99, cost_price: 3.5 }),
        product({ name: 'Body Wash', code: 'WASH01', sale_price: 11.5, cost_price: 4 }),
      ],
    },
    {
      name: 'Salon Retail',
      slug: 'salon',
      products: [
        product({ name: 'Nail Care Kit', code: 'NAIL01', sale_price: 15.99, cost_price: 6 }),
        product({ name: 'Makeup Remover Wipes', code: 'WIPE01', sale_price: 7.99, cost_price: 2.5 }),
        product({ name: 'Lip Balm Duo', code: 'LIP01', sale_price: 8.5, cost_price: 3 }),
      ],
    },
  ],
};
