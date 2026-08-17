const { product } = require('./_helpers');

module.exports = {
  type: 'restaurant',
  categories: [
    {
      name: 'Coffee & Drinks',
      slug: 'drinks',
      products: [
        product({ name: 'House Coffee', code: 'COFF01', sale_price: 3.5, cost_price: 0.8, stock: 50 }),
        product({ name: 'Iced Latte', code: 'LATTE01', sale_price: 4.75, cost_price: 1.2, stock: 50 }),
        product({ name: 'Fresh Orange Juice', code: 'OJ01', sale_price: 4.25, cost_price: 1.5, stock: 40 }),
      ],
    },
    {
      name: 'Breakfast',
      slug: 'breakfast',
      products: [
        product({ name: 'Avocado Toast', code: 'AVO01', sale_price: 8.5, cost_price: 2.8 }),
        product({ name: 'Breakfast Sandwich', code: 'BFS01', sale_price: 7.99, cost_price: 2.5 }),
        product({ name: 'Yogurt Parfait', code: 'YOG01', sale_price: 5.5, cost_price: 1.8 }),
      ],
    },
    {
      name: 'Mains',
      slug: 'mains',
      products: [
        product({ name: 'Chicken Wrap', code: 'WRAP01', sale_price: 10.99, cost_price: 3.5 }),
        product({ name: 'Garden Salad Bowl', code: 'SAL01', sale_price: 9.5, cost_price: 2.8 }),
        product({ name: 'Classic Burger', code: 'BRG01', sale_price: 11.5, cost_price: 4 }),
      ],
    },
    {
      name: 'Pastries',
      slug: 'pastries',
      products: [
        product({ name: 'Butter Croissant', code: 'CRO01', sale_price: 3.25, cost_price: 0.9 }),
        product({ name: 'Blueberry Muffin', code: 'MUF01', sale_price: 3.75, cost_price: 1 }),
        product({ name: 'Chocolate Cookie', code: 'CKI01', sale_price: 2.5, cost_price: 0.6 }),
      ],
    },
  ],
};
