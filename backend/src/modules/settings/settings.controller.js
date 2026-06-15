const settingsService = require('./settings.service');
const { success } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  get: asyncHandler(async (req, res) => {
    const data = await settingsService.getBusinessSettings(req.tenant.id);
    return success(res, data);
  }),

  update: asyncHandler(async (req, res) => {
    const data = await settingsService.updateBusinessSettings(req.tenant.id, req.body);
    return success(res, data, 'Settings updated');
  }),
};
