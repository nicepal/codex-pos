const webhookService = require('./webhooks.service');
const { success, created } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => success(res, await webhookService.list(req.tenant.id))),
  create: asyncHandler(async (req, res) => created(res, await webhookService.create(req.tenant.id, req.body))),
  remove: asyncHandler(async (req, res) => {
    await webhookService.remove(req.tenant.id, req.params.id);
    return success(res, null, 'Webhook deleted');
  }),
};
