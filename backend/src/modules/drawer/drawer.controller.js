const drawerService = require('./drawer.service');
const { success, created } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  listOpen: asyncHandler(async (req, res) => success(res, await drawerService.listOpen(req.tenant.id))),
  open: asyncHandler(async (req, res) => created(res, await drawerService.open(req.tenant.id, req.body, req.user.id))),
  close: asyncHandler(async (req, res) => success(res, await drawerService.close(req.tenant.id, req.params.id, req.body, req.user.id), 'Drawer closed')),
};
