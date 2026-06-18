const { asyncHandler } = require('../../../middleware/errorHandler');
const { success, created } = require('../../../shared/response');
const service = require('./shopify.service');

module.exports = {
  connect: asyncHandler(async (req, res) =>
    success(res, await service.connect(req.tenant.id, req.body, req.user?.id), 'Shopify store connected')),

  status: asyncHandler(async (req, res) =>
    success(res, await service.getStatus(req.tenant.id))),

  disconnect: asyncHandler(async (req, res) =>
    success(res, await service.disconnect(req.tenant.id), 'Shopify store disconnected')),

  import: asyncHandler(async (req, res) =>
    created(res, await service.startImport(req.tenant.id, req.body, req.user?.id), 'Import started')),

  sync: asyncHandler(async (req, res) =>
    created(res, await service.sync(req.tenant.id, req.user?.id), 'Sync started')),

  listJobs: asyncHandler(async (req, res) =>
    success(res, await service.listJobs(req.tenant.id, { limit: req.query.limit }))),

  getJob: asyncHandler(async (req, res) =>
    success(res, await service.getJob(req.tenant.id, req.params.id))),
};
