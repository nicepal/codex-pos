const { asyncHandler } = require('../../middleware/errorHandler');
const { success, created } = require('../../shared/response');
const service = require('./api-keys.service');

module.exports = {
  list: asyncHandler(async (req, res) => success(res, await service.list(req.tenant.id))),
  create: asyncHandler(async (req, res) => created(
    res,
    await service.create(req.tenant.id, req.body, req.user?.id),
    'API key created. Copy it now — it will not be shown again.'
  )),
  revoke: asyncHandler(async (req, res) => success(res, await service.revoke(req.tenant.id, req.params.id), 'API key revoked')),
};
