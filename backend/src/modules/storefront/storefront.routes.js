const router = require('express').Router();
const controller = require('./storefront.controller');
const { requireTenant } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validate');
const { checkoutSchema } = require('../orders/orders.validation');

router.use(requireTenant);

router.get('/', controller.storeInfo);
router.get('/products', controller.products);
router.get('/products/:slug', controller.product);
router.get('/categories', controller.categories);
router.post('/checkout', validate(checkoutSchema), controller.checkout);
router.get('/theme', controller.theme);
router.get('/sitemap', controller.sitemap);

module.exports = router;
