const service = require('./sso.service');
const { success } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  getConfig: asyncHandler(async (req, res) => {
    return success(res, await service.getConfig(req.tenant.id));
  }),

  upsertConfig: asyncHandler(async (req, res) => {
    const row = await service.upsertConfig(req.tenant.id, req.body);
    return success(res, row, 'SSO config saved');
  }),

  authorize: asyncHandler(async (req, res) => {
    const row = await service.buildAuthorizeUrl(req.tenant.id, req.query);
    return success(res, row);
  }),

  callback: asyncHandler(async (req, res) => {
    const row = await service.handleCallback(req.tenant.id, req.body);
    return success(res, row, 'SSO callback processed');
  }),

  listScimUsers: asyncHandler(async (req, res) => {
    const data = await service.listScimUsers(req.tenant.id, req.query);
    return res.json(data);
  }),

  createScimUser: asyncHandler(async (req, res) => {
    const data = await service.createScimUser(req.tenant.id, req.body);
    return res.status(201).json(data);
  }),
};
