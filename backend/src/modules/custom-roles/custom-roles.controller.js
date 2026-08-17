const service = require('./custom-roles.service');
const { success } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => success(res, await service.list(req.tenant.id))),
  create: asyncHandler(async (req, res) => success(res, await service.create(req.tenant.id, req.body), 'Role created', 201)),
  update: asyncHandler(async (req, res) => success(res, await service.update(req.tenant.id, req.params.id, req.body), 'Role updated')),
  remove: asyncHandler(async (req, res) => success(res, await service.remove(req.tenant.id, req.params.id), 'Role deleted')),
  assign: asyncHandler(async (req, res) => success(
    res,
    await service.assignToUser(req.tenant.id, req.params.id, req.body.user_id),
    'Role assigned'
  )),
  unassign: asyncHandler(async (req, res) => success(
    res,
    await service.unassignFromUser(req.tenant.id, req.body.user_id),
    'Role unassigned'
  )),
};
