const drawerService = require('./drawer.service');
const { success, created } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  listOpen: asyncHandler(async (req, res) => {
    return success(res, await drawerService.listOpen(req.tenant.id, req.query));
  }),
  open: asyncHandler(async (req, res) => {
    return created(res, await drawerService.open(req.tenant.id, req.body, req.user.id));
  }),
  summary: asyncHandler(async (req, res) => {
    return success(res, await drawerService.summary(req.tenant.id, req.params.id));
  }),
  addMovement: asyncHandler(async (req, res) => {
    const row = await drawerService.addMovement(req.tenant.id, req.params.id, req.body, req.user.id);
    return created(res, row, 'Cash movement recorded');
  }),
  close: asyncHandler(async (req, res) => {
    return success(res, await drawerService.close(req.tenant.id, req.params.id, req.body, req.user.id), 'Drawer closed');
  }),
};
