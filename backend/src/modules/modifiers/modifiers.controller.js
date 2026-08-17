const service = require('./modifiers.service');
const { success } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  listGroups: asyncHandler(async (req, res) => {
    return success(res, await service.listGroups(req.tenant.id, req.query));
  }),

  getGroup: asyncHandler(async (req, res) => {
    return success(res, await service.getGroupWithOptions(req.tenant.id, req.params.id));
  }),

  createGroup: asyncHandler(async (req, res) => {
    return success(res, await service.createGroup(req.tenant.id, req.body), 'Modifier group created', 201);
  }),

  updateGroup: asyncHandler(async (req, res) => {
    return success(res, await service.updateGroup(req.tenant.id, req.params.id, req.body), 'Modifier group updated');
  }),

  deleteGroup: asyncHandler(async (req, res) => {
    return success(res, await service.deleteGroup(req.tenant.id, req.params.id), 'Modifier group deleted');
  }),

  createOption: asyncHandler(async (req, res) => {
    return success(res, await service.createOption(req.tenant.id, req.params.groupId, req.body), 'Modifier option created', 201);
  }),

  updateOption: asyncHandler(async (req, res) => {
    return success(res, await service.updateOption(req.tenant.id, req.params.id, req.body), 'Modifier option updated');
  }),

  deleteOption: asyncHandler(async (req, res) => {
    return success(res, await service.deleteOption(req.tenant.id, req.params.id), 'Modifier option deleted');
  }),

  getProductModifiers: asyncHandler(async (req, res) => {
    return success(res, await service.getProductModifiers(req.tenant.id, req.params.productId));
  }),

  setProductModifiers: asyncHandler(async (req, res) => {
    const rows = await service.setProductModifiers(
      req.tenant.id,
      req.params.productId,
      req.body.modifier_group_ids
    );
    return success(res, rows, 'Product modifiers updated');
  }),
};
