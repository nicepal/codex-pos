const { product } = require('./_helpers');

module.exports = {
  type: 'retail',
  categories: [
    {
      name: 'Everyday Essentials',
      slug: 'essentials',
      products: [
        product({ name: 'Reusable Tote Bag', code: 'TOTE01', sale_price: 12.99, cost_price: 4.5 }),
        product({ name: 'Stainless Water Bottle', code: 'BTL01', sale_price: 18.5, cost_price: 7 }),
        product({ name: 'Notebook Set (3-pack)', code: 'NOTE01', sale_price: 9.99, cost_price: 3.5 }),
      ],
    },
    {
      name: 'Home & Living',
      slug: 'home',
      products: [
        product({ name: 'Scented Candle', code: 'CNDL01', sale_price: 14.99, cost_price: 5 }),
        product({ name: 'Desk Organizer', code: 'DESK01', sale_price: 22.0, cost_price: 9 }),
        product({ name: 'Throw Pillow Cover', code: 'PIL01', sale_price: 16.5, cost_price: 6 }),
      ],
    },
    {
      name: 'Gifts',
      slug: 'gifts',
      products: [
        product({ name: 'Gift Wrap Kit', code: 'GIFT01', sale_price: 8.99, cost_price: 3 }),
        product({ name: 'Greeting Card Assortment', code: 'CARD01', sale_price: 6.5, cost_price: 2 }),
        product({ name: 'Mini Photo Frame', code: 'FRAM01', sale_price: 11.99, cost_price: 4 }),
      ],
    },
    {
      name: 'Accessories',
      slug: 'accessories',
      products: [
        product({ name: 'Phone Stand', code: 'PHST01', sale_price: 15.0, cost_price: 5.5 }),
        product({ name: 'Keychain Set', code: 'KEY01', sale_price: 7.99, cost_price: 2.5 }),
        product({ name: 'Cable Organizer', code: 'CABL01', sale_price: 9.5, cost_price: 3 }),
      ],
    },
  ],
};
