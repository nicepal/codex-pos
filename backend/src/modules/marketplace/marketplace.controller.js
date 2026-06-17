const { asyncHandler } = require('../../middleware/errorHandler');
const { success } = require('../../shared/response');
const service = require('./marketplace.service');

module.exports = {
  list: asyncHandler(async (req, res) => success(res, await service.list(req.tenant.id))),
  connect: asyncHandler(async (req, res) => success(res, await service.connect(req.tenant.id, req.body), 'Channel connected')),
  disconnect: asyncHandler(async (req, res) => success(res, await service.disconnect(req.tenant.id, req.params.channel), 'Channel disconnected')),
  sync: asyncHandler(async (req, res) => success(res, await service.syncNow(req.tenant.id, req.params.channel), 'Sync complete')),
};
