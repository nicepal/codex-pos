const ticketService = require('../modules/tickets/tickets.service');
const { asyncHandler } = require('./errorHandler');

function requireTicketAccess(paramName = 'id') {
  return asyncHandler(async (req, res, next) => {
    await ticketService._assertTicketAccess(req.params[paramName], {
      tenantId: req.tenant?.id || req.user.tenant_id,
      user: req.user,
    });
    next();
  });
}

module.exports = { requireTicketAccess };
