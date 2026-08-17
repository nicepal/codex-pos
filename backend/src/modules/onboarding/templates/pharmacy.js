const { product } = require('./_helpers');

// Pharmacy template: personal care & first aid ONLY — no prescription or controlled medicines.
module.exports = {
  type: 'pharmacy',
  categories: [
    {
      name: 'First Aid',
      slug: 'first-aid',
      products: [
        product({ name: 'Adhesive Bandages (30)', code: 'BAND01', sale_price: 5.99, cost_price: 2 }),
        product({ name: 'Antiseptic Wipes', code: 'ANTI01', sale_price: 4.49, cost_price: 1.5 }),
        product({ name: 'Elastic Support Wrap', code: 'WRAPF01', sale_price: 8.99, cost_price: 3 }),
      ],
    },
    {
      name: 'Personal Care',
      slug: 'personal-care',
      products: [
        product({ name: 'Toothpaste', code: 'TP01', sale_price: 4.29, cost_price: 1.8 }),
        product({ name: 'Soft Toothbrush (2-pack)', code: 'TB01', sale_price: 5.49, cost_price: 2 }),
        product({ name: 'Hand Sanitizer 250ml', code: 'SAN01', sale_price: 3.99, cost_price: 1.2 }),
      ],
    },
    {
      name: 'Wellness Basics',
      slug: 'wellness',
      products: [
        product({ name: 'Digital Thermometer', code: 'THERM01', sale_price: 12.99, cost_price: 5 }),
        product({ name: 'Vitamin C Gummies', code: 'VITC01', sale_price: 11.99, cost_price: 4.5 }),
        product({ name: 'Electrolyte Drink Mix', code: 'ELEC01', sale_price: 9.99, cost_price: 3.5 }),
      ],
    },
    {
      name: 'Baby & Family',
      slug: 'family',
      products: [
        product({ name: 'Gentle Baby Wipes', code: 'BW01', sale_price: 6.49, cost_price: 2.5 }),
        product({ name: 'Cotton Swabs', code: 'COT01', sale_price: 3.29, cost_price: 1 }),
        product({ name: 'Lip Care Balm', code: 'LIPB01', sale_price: 4.99, cost_price: 1.5 }),
      ],
    },
  ],
};
