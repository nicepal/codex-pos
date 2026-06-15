const auditService = require('./audit.service');
const { paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => {
    const result = await auditService.list(req.query);
    return paginated(res, result.rows, result.pagination);
  }),
};
