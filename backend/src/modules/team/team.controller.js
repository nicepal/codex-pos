const teamService = require('./team.service');
const { success, created } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => success(res, await teamService.list(req.tenant.id))),
  invite: asyncHandler(async (req, res) => created(res, await teamService.invite(req.tenant.id, req.body, req.user.id), 'Team member invited')),
  updateRole: asyncHandler(async (req, res) => success(res, await teamService.updateRole(req.tenant.id, req.params.userId, req.body.role), 'Role updated')),
  remove: asyncHandler(async (req, res) => {
    await teamService.remove(req.tenant.id, req.params.userId);
    return success(res, null, 'Team member removed');
  }),
  bulkRemove: asyncHandler(async (req, res) => {
    const { parseBulkIds } = require('../../shared/bulk-delete');
    const ids = parseBulkIds(req.body);
    const result = await teamService.bulkRemove(req.tenant.id, ids);
    return success(res, result, `${result.deleted} team member(s) removed`);
  }),
};
