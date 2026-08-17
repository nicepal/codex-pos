const retail = require('./retail');
const restaurant = require('./restaurant');
const grocery = require('./grocery');
const fashion = require('./fashion');
const electronics = require('./electronics');
const beauty = require('./beauty');
const pharmacy = require('./pharmacy');
const wholesale = require('./wholesale');
const general = require('./general');

const TEMPLATES = {
  retail,
  restaurant,
  grocery,
  fashion,
  electronics,
  beauty,
  pharmacy,
  wholesale,
  general,
};

function getTemplate(type) {
  return TEMPLATES[type] || null;
}

function summarizeTemplate(type) {
  const tpl = getTemplate(type);
  if (!tpl) return null;
  const categories = tpl.categories.length;
  const products = tpl.categories.reduce((n, c) => n + c.products.length, 0);
  return { type, categories, products };
}

module.exports = {
  TEMPLATES,
  getTemplate,
  summarizeTemplate,
};
