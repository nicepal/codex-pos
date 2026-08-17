const router = require('express').Router();
const controller = require('./orgs.controller');
const { authenticate, requirePlatformAdmin } = require('../../middleware/auth');

router.use(authenticate, requirePlatformAdmin);

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id/tenants', controller.tenants);
router.get('/:id/rollup', controller.rollup);
router.post('/:id/attach', controller.attach);

module.exports = router;
