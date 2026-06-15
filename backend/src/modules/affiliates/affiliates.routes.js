const router = require('express').Router();
const controller = require('./affiliates.controller');
const { authenticate, requirePlatformAdmin } = require('../../middleware/auth');

router.use(authenticate, requirePlatformAdmin);
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id/commissions', controller.commissions);
router.post('/:id/commissions/:commissionId/approve', controller.approve);
router.post('/:id/commissions/:commissionId/pay', controller.pay);

module.exports = router;
