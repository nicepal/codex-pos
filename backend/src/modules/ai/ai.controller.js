const { asyncHandler } = require('../../middleware/errorHandler');
const { success } = require('../../shared/response');
const { ValidationError } = require('../../shared/errors');
const service = require('./ai.service');

module.exports = {
  reorder: asyncHandler(async (req, res) => {
    const result = await service.reorderSuggestions(req.tenant.id, {
      days: req.query.days,
      leadTimeDays: req.query.lead_time_days,
      coverDays: req.query.cover_days,
    });
    return success(res, result);
  }),
  ask: asyncHandler(async (req, res) => {
    const question = (req.body.question || '').trim();
    if (!question) throw new ValidationError('A question is required');
    return success(res, await service.ask(req.tenant.id, question));
  }),
  forecast: asyncHandler(async (req, res) => {
    return success(res, await service.forecastSales(req.tenant.id, req.body || req.query, req.user?.id));
  }),
  productDescription: asyncHandler(async (req, res) => {
    return success(res, await service.generateProductDescription(req.tenant.id, req.body, req.user?.id));
  }),
  generateEmail: asyncHandler(async (req, res) => {
    return success(res, await service.generateEmail(req.tenant.id, req.body, req.user?.id));
  }),
  chatSupport: asyncHandler(async (req, res) => {
    return success(res, await service.chatSupport(req.tenant.id, req.body, req.user?.id));
  }),
};
