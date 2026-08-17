/** @param {string} type @param {string} code */
function sku(type, code) {
  return `OB-${String(type).toUpperCase()}-${String(code).toUpperCase()}`;
}

/** @param {string} type @param {string} slug */
function catSlug(type, slug) {
  return `ob-${type}-${slug}`;
}

/**
 * @param {object} p
 * @param {string} p.name
 * @param {string} p.code
 * @param {number} p.sale_price
 * @param {number} [p.cost_price]
 * @param {number} [p.stock]
 * @param {object[]} [p.variants]
 */
function product(p) {
  return {
    name: p.name,
    code: p.code,
    sale_price: p.sale_price,
    cost_price: p.cost_price ?? Math.round(p.sale_price * 0.55 * 100) / 100,
    stock: p.stock ?? 25,
    variants: p.variants || null,
  };
}

module.exports = { sku, catSlug, product };
