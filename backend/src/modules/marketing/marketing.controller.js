const service = require('./marketing.service');
const { success, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  syncCart: asyncHandler(async (req, res) => {
    const row = await service.syncCart(req.tenant.id, req.body);
    return success(res, row, 'Cart synced');
  }),

  listAbandonedCarts: asyncHandler(async (req, res) => {
    const result = await service.listAbandonedCarts(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),

  recoverCart: asyncHandler(async (req, res) => {
    const row = await service.recoverCart(req.tenant.id, req.params.id);
    return success(res, row, 'Recovery email queued');
  }),

  listCampaigns: asyncHandler(async (req, res) => {
    const result = await service.listCampaigns(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),

  createCampaign: asyncHandler(async (req, res) => {
    const row = await service.createCampaign(req.tenant.id, req.body, req.user?.id);
    return success(res, row, 'Campaign created', 201);
  }),

  getCampaign: asyncHandler(async (req, res) => {
    return success(res, await service.getCampaign(req.tenant.id, req.params.id));
  }),

  sendCampaign: asyncHandler(async (req, res) => {
    const row = await service.sendCampaign(req.tenant.id, req.params.id);
    return success(res, row, 'Campaign send started');
  }),

  listSegments: asyncHandler(async (req, res) => {
    return success(res, await service.listSegments(req.tenant.id));
  }),

  createSegment: asyncHandler(async (req, res) => {
    const row = await service.createSegment(req.tenant.id, req.body);
    return success(res, row, 'Segment created', 201);
  }),

  updateSegment: asyncHandler(async (req, res) => {
    const row = await service.updateSegment(req.tenant.id, req.params.id, req.body);
    return success(res, row, 'Segment updated');
  }),

  listLoyaltyTiers: asyncHandler(async (req, res) => {
    return success(res, await service.listLoyaltyTiers(req.tenant.id));
  }),

  createLoyaltyTier: asyncHandler(async (req, res) => {
    const row = await service.createLoyaltyTier(req.tenant.id, req.body);
    return success(res, row, 'Loyalty tier created', 201);
  }),

  updateLoyaltyTier: asyncHandler(async (req, res) => {
    const row = await service.updateLoyaltyTier(req.tenant.id, req.params.id, req.body);
    return success(res, row, 'Loyalty tier updated');
  }),

  assignLoyaltyTier: asyncHandler(async (req, res) => {
    const row = await service.assignLoyaltyTier(req.tenant.id, req.params.customerId || req.body.customer_id);
    return success(res, row, 'Loyalty tier assigned');
  }),

  createReferral: asyncHandler(async (req, res) => {
    const row = await service.createReferral(
      req.tenant.id,
      req.body.customer_id,
      req.body.reward_points
    );
    return success(res, row, 'Referral code created', 201);
  }),

  redeemReferral: asyncHandler(async (req, res) => {
    const row = await service.redeemReferral(
      req.tenant.id,
      req.body.code,
      req.body.referee_customer_id || req.body.customer_id
    );
    return success(res, row, 'Referral redeemed');
  }),

  trackAffiliate: asyncHandler(async (req, res) => {
    const row = await service.trackAffiliateClick(req.tenant.id, req.body, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return success(res, row, 'Click tracked', 201);
  }),
};
