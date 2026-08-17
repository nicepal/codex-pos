const onboardingService = require('./onboarding.service');
const { success, created } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  listBusinessTypes: asyncHandler(async (req, res) => {
    return success(res, onboardingService.listBusinessTypes());
  }),

  getStatus: asyncHandler(async (req, res) => {
    const status = await onboardingService.getStatus(req.tenant.id);
    return success(res, status);
  }),

  selectBusinessType: asyncHandler(async (req, res) => {
    const status = await onboardingService.selectBusinessType(
      req.tenant.id,
      req.body.business_type,
      req.user?.id
    );
    return success(res, status, 'Business type selected');
  }),

  setup: asyncHandler(async (req, res) => {
    const result = await onboardingService.setup(req.tenant.id, req.user?.id);
    return created(res, result, 'Starter catalog ready');
  }),

  skip: asyncHandler(async (req, res) => {
    const status = await onboardingService.skip(req.tenant.id, req.user?.id);
    return success(res, status, 'Onboarding skipped');
  }),
};
