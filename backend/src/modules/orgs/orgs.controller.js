const orgsService = require('./orgs.service');
const { success } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => success(res, await orgsService.list())),
  create: asyncHandler(async (req, res) => success(res, await orgsService.create(req.body), 'Org created', 201)),
  attach: asyncHandler(async (req, res) => {
    const row = await orgsService.attachTenant(req.params.id, req.body.tenant_id, req.body.role);
    return success(res, row, 'Tenant attached');
  }),
  tenants: asyncHandler(async (req, res) => success(res, await orgsService.listTenants(req.params.id))),
  rollup: asyncHandler(async (req, res) => success(res, await orgsService.rollup(req.params.id))),
};
