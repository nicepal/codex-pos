const service = require('./print.service');
const { success, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  createReceipt: asyncHandler(async (req, res) => {
    const row = await service.createReceiptJob(req.tenant.id, req.body);
    return success(res, row, 'Print job queued', 201);
  }),

  listJobs: asyncHandler(async (req, res) => {
    const result = await service.listJobs(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),

  claimNext: asyncHandler(async (req, res) => {
    const job = await service.claimNextJob(req.tenant.id, req.body || {});
    return success(res, job, job ? 'Print job claimed' : 'No queued print jobs');
  }),

  completeJob: asyncHandler(async (req, res) => {
    const row = await service.completeJob(req.tenant.id, req.params.id, req.body || {});
    return success(res, row, 'Print job completed');
  }),

  failJob: asyncHandler(async (req, res) => {
    const row = await service.failJob(req.tenant.id, req.params.id, req.body || {});
    return success(res, row, 'Print job failed');
  }),
};
