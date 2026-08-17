const { product } = require('./_helpers');

module.exports = {
  type: 'fashion',
  categories: [
    {
      name: 'Tops',
      slug: 'tops',
      products: [
        product({
          name: 'Classic Cotton Tee',
          code: 'TEE01',
          sale_price: 24.99,
          cost_price: 9,
          stock: 30,
          variants: [
            { name: 'Small', sku_suffix: 'S', attributes: { size: 'S' }, stock_quantity: 10 },
            { name: 'Medium', sku_suffix: 'M', attributes: { size: 'M' }, stock_quantity: 10 },
            { name: 'Large', sku_suffix: 'L', attributes: { size: 'L' }, stock_quantity: 10 },
          ],
        }),
        product({ name: 'Linen Shirt', code: 'SHIRT01', sale_price: 39.99, cost_price: 15 }),
        product({ name: 'Hoodie', code: 'HOOD01', sale_price: 49.99, cost_price: 20 }),
      ],
    },
    {
      name: 'Bottoms',
      slug: 'bottoms',
      products: [
        product({ name: 'Slim Jeans', code: 'JEAN01', sale_price: 54.99, cost_price: 22 }),
        product({ name: 'Chino Pants', code: 'CHINO01', sale_price: 44.99, cost_price: 18 }),
        product({ name: 'Athletic Shorts', code: 'SHORT01', sale_price: 29.99, cost_price: 11 }),
      ],
    },
    {
      name: 'Accessories',
      slug: 'accessories',
      products: [
        product({ name: 'Leather Belt', code: 'BELT01', sale_price: 28.0, cost_price: 10 }),
        product({ name: 'Canvas Cap', code: 'CAP01', sale_price: 18.5, cost_price: 6 }),
        product({ name: 'Wool Scarf', code: 'SCARF01', sale_price: 22.99, cost_price: 8 }),
      ],
    },
    {
      name: 'Footwear',
      slug: 'footwear',
      products: [
        product({ name: 'Canvas Sneakers', code: 'SNK01', sale_price: 59.99, cost_price: 24 }),
        product({ name: 'Slide Sandals', code: 'SAND01', sale_price: 24.99, cost_price: 9 }),
        product({ name: 'Ankle Socks (3-pack)', code: 'SOCK01', sale_price: 12.99, cost_price: 4 }),
      ],
    },
  ],
};
