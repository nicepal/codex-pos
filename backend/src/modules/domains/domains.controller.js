const { asyncHandler } = require('../../middleware/errorHandler');
const { success, created } = require('../../shared/response');
const service = require('./domains.service');

module.exports = {
  list: asyncHandler(async (req, res) => success(res, await service.list(req.tenant.id))),
  create: asyncHandler(async (req, res) => created(res, await service.addCustom(req.tenant.id, req.body.domain), 'Domain added')),
  remove: asyncHandler(async (req, res) => success(res, await service.remove(req.tenant.id, req.params.id), 'Domain removed')),
  verify: asyncHandler(async (req, res) => success(res, await service.verify(req.tenant.id, req.params.id), 'Domain verified')),
};
