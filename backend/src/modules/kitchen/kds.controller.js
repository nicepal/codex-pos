const kitchenService = require('./kitchen.service');
const { success } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

function branchFromQuery(req) {
  return req.query.branch_id || req.body?.branch_id || null;
}

module.exports = {
  listTickets: asyncHandler(async (req, res) => {
    const branchId = branchFromQuery(req);
    const rows = await kitchenService.listTickets(req.tenant.id, {
      branch_id: branchId,
      status: req.query.status,
      station_id: req.query.station_id,
      active_only: req.query.active_only !== 'false',
    });
    return success(res, rows);
  }),

  getTicket: asyncHandler(async (req, res) => {
    const row = await kitchenService.getTicketById(req.tenant.id, req.params.id, {
      branchId: branchFromQuery(req),
    });
    return success(res, row);
  }),

  acceptTicket: asyncHandler(async (req, res) => {
    const row = await kitchenService.acceptTicket(req.tenant.id, req.params.id, req.user?.id, {
      branchId: branchFromQuery(req),
    });
    return success(res, row, 'Ticket accepted');
  }),

  startTicket: asyncHandler(async (req, res) => {
    const row = await kitchenService.startTicket(req.tenant.id, req.params.id, req.user?.id, {
      branchId: branchFromQuery(req),
    });
    return success(res, row, 'Ticket started');
  }),

  readyTicket: asyncHandler(async (req, res) => {
    const row = await kitchenService.readyTicket(req.tenant.id, req.params.id, req.user?.id, {
      branchId: branchFromQuery(req),
    });
    return success(res, row, 'Ticket ready');
  }),

  completeTicket: asyncHandler(async (req, res) => {
    const row = await kitchenService.completeTicket(req.tenant.id, req.params.id, req.user?.id, {
      branchId: branchFromQuery(req),
    });
    return success(res, row, 'Ticket served');
  }),

  cancelTicket: asyncHandler(async (req, res) => {
    const row = await kitchenService.cancelTicket(req.tenant.id, req.params.id, req.user?.id, {
      branchId: branchFromQuery(req),
    });
    return success(res, row, 'Ticket cancelled');
  }),

  recallTicket: asyncHandler(async (req, res) => {
    const row = await kitchenService.recallTicket(req.tenant.id, req.params.id, req.user?.id, {
      branchId: branchFromQuery(req),
    });
    return success(res, row, 'Ticket recalled');
  }),

  setPriority: asyncHandler(async (req, res) => {
    const row = await kitchenService.setPriority(
      req.tenant.id,
      req.params.id,
      parseInt(req.body.priority, 10) || 0,
      { branchId: branchFromQuery(req) }
    );
    return success(res, row, 'Priority updated');
  }),

  listStations: asyncHandler(async (req, res) => {
    return success(res, await kitchenService.listStations(req.tenant.id, req.query));
  }),

  createStation: asyncHandler(async (req, res) => {
    const row = await kitchenService.createStation(req.tenant.id, req.body);
    return success(res, row, 'Station created', 201);
  }),

  updateStation: asyncHandler(async (req, res) => {
    const row = await kitchenService.updateStation(req.tenant.id, req.params.id, req.body);
    return success(res, row, 'Station updated');
  }),

  deleteStation: asyncHandler(async (req, res) => {
    return success(res, await kitchenService.deleteStation(req.tenant.id, req.params.id), 'Station deleted');
  }),
};
