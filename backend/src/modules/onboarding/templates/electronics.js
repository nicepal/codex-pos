const { product } = require('./_helpers');

module.exports = {
  type: 'electronics',
  categories: [
    {
      name: 'Audio',
      slug: 'audio',
      products: [
        product({ name: 'Wireless Earbuds', code: 'EAR01', sale_price: 49.99, cost_price: 22 }),
        product({ name: 'Bluetooth Speaker', code: 'SPK01', sale_price: 39.99, cost_price: 18 }),
        product({ name: 'USB-C Headphones', code: 'HP01', sale_price: 29.99, cost_price: 12 }),
      ],
    },
    {
      name: 'Charging',
      slug: 'charging',
      products: [
        product({ name: '20W Wall Charger', code: 'CHG01', sale_price: 19.99, cost_price: 7 }),
        product({ name: 'USB-C Cable 2m', code: 'CABLE01', sale_price: 12.99, cost_price: 4 }),
        product({ name: 'Power Bank 10k', code: 'PB01', sale_price: 34.99, cost_price: 15 }),
      ],
    },
    {
      name: 'Accessories',
      slug: 'accessories',
      products: [
        product({ name: 'Phone Case Clear', code: 'CASE01', sale_price: 14.99, cost_price: 4 }),
        product({ name: 'Screen Protector', code: 'SCR01', sale_price: 9.99, cost_price: 2.5 }),
        product({ name: 'Laptop Sleeve 13"', code: 'SLV01', sale_price: 24.99, cost_price: 9 }),
      ],
    },
    {
      name: 'Smart Home',
      slug: 'smarthome',
      products: [
        product({ name: 'Smart Plug', code: 'PLUG01', sale_price: 17.99, cost_price: 7 }),
        product({ name: 'LED Desk Lamp', code: 'LAMP01', sale_price: 32.99, cost_price: 14 }),
        product({ name: 'Webcam HD', code: 'CAM01', sale_price: 44.99, cost_price: 20 }),
      ],
    },
  ],
};
