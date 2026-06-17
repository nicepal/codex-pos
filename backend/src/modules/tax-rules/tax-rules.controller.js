const { asyncHandler } = require('../../middleware/errorHandler');
const { success } = require('../../shared/response');
const service = require('./tax-rules.service');

module.exports = {
  list: asyncHandler(async (req, res) => success(res, await service.list(req.tenant.id))),
  getById: asyncHandler(async (req, res) => success(res, await service.getById(req.tenant.id, req.params.id))),
  create: asyncHandler(async (req, res) => success(res, await service.create(req.tenant.id, req.body), 'Tax rule created', 201)),
  update: asyncHandler(async (req, res) => success(res, await service.update(req.tenant.id, req.params.id, req.body), 'Tax rule updated')),
  remove: asyncHandler(async (req, res) => success(res, await service.remove(req.tenant.id, req.params.id), 'Tax rule deleted')),
};
