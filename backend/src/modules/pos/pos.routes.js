const express = require('express');
const router = express.Router();
const { authenticate, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { success } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');
const { emitToTenant } = require('../../realtime/socket');

router.use(authenticate, requireTenant, requireTenantAccess);

router.post('/display', asyncHandler(async (req, res) => {
  emitToTenant(req.tenant.id, 'pos.display', req.body || {});
  return success(res, { published: true });
}));

module.exports = router;
