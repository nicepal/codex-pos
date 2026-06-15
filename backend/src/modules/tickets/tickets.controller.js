const ticketService = require('./tickets.service');
const { success, created, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

function ticketContext(req) {
  return { tenantId: req.tenant?.id || req.user.tenant_id, user: req.user };
}

module.exports = {
  list: asyncHandler(async (req, res) => {
    const isStaff = req.user.roles?.some((r) => ['super_admin', 'support_agent'].includes(r));
    const tenantId = req.tenant?.id || (isStaff ? null : req.user.tenant_id);
    const result = await ticketService.list(tenantId, {
      ...req.query,
      all: req.query.all || (isStaff ? 'true' : undefined),
    });
    return paginated(res, result.rows, result.pagination);
  }),

  getById: asyncHandler(async (req, res) => {
    const ticket = await ticketService.getById(req.tenant?.id || req.user.tenant_id, req.params.id, req.user);
    return success(res, ticket);
  }),

  create: asyncHandler(async (req, res) => {
    const tenantId = req.tenant?.id || req.user.tenant_id;
    const ticket = await ticketService.create(tenantId, { ...req.body, user_id: req.user.id });
    return created(res, ticket);
  }),

  reply: asyncHandler(async (req, res) => {
    const ticket = await ticketService.reply(req.params.id, req.user, req.body.message, req.body.is_internal);
    return success(res, ticket);
  }),

  assign: asyncHandler(async (req, res) => {
    const ticket = await ticketService.assign(req.params.id, req.body.assigned_to);
    return success(res, ticket);
  }),

  close: asyncHandler(async (req, res) => {
    const ticket = await ticketService.close(req.params.id, ticketContext(req));
    return success(res, ticket);
  }),

  resolve: asyncHandler(async (req, res) => {
    const ticket = await ticketService.resolve(req.params.id, ticketContext(req));
    return success(res, ticket);
  }),

  reopen: asyncHandler(async (req, res) => {
    const ticket = await ticketService.reopen(req.params.id, ticketContext(req));
    return success(res, ticket);
  }),
};
