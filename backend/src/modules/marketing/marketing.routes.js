const router = require('express').Router();
const controller = require('./marketing.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');
const { isFeatureEnabled, resolveTenantFeatures } = require('../../shared/features');
const { ForbiddenError } = require('../../shared/errors');

function requireAnyFeature(...keys) {
  return async (req, res, next) => {
    try {
      if (!req.tenant?.id) throw new ForbiddenError('Tenant context required');
      const features = await resolveTenantFeatures(req.tenant.id);
      req.tenantFeatures = features;
      if (!keys.some((k) => isFeatureEnabled(features, k))) {
        throw new ForbiddenError(`One of features [${keys.join(', ')}] is required`);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

router.use(authenticate, requireTenant, requireTenantAccess);

// Carts / campaigns — Marketing Pro
router.post('/carts/sync', requireFeature('marketing_pro'), authorize('business.settings', 'business.customers'), controller.syncCart);
router.get('/carts/abandoned', requireFeature('marketing_pro'), authorize('business.settings', 'business.customers'), controller.listAbandonedCarts);
router.post('/carts/:id/recover', requireFeature('marketing_pro'), authorize('business.settings', 'business.customers'), controller.recoverCart);

router.get('/campaigns', requireFeature('marketing_pro'), authorize('business.settings', 'business.customers'), controller.listCampaigns);
router.post('/campaigns', requireFeature('marketing_pro'), authorize('business.settings'), controller.createCampaign);
router.get('/campaigns/:id', requireFeature('marketing_pro'), authorize('business.settings', 'business.customers'), controller.getCampaign);
router.post('/campaigns/:id/send', requireFeature('marketing_pro'), authorize('business.settings'), controller.sendCampaign);

// Segments / loyalty / referrals — CRM Pro (or Marketing Pro)
router.get('/segments', requireAnyFeature('crm_pro', 'marketing_pro'), authorize('business.customers'), controller.listSegments);
router.post('/segments', requireAnyFeature('crm_pro', 'marketing_pro'), authorize('business.customers'), controller.createSegment);
router.put('/segments/:id', requireAnyFeature('crm_pro', 'marketing_pro'), authorize('business.customers'), controller.updateSegment);

router.get('/loyalty-tiers', requireAnyFeature('crm_pro', 'marketing_pro'), authorize('business.customers'), controller.listLoyaltyTiers);
router.post('/loyalty-tiers', requireAnyFeature('crm_pro', 'marketing_pro'), authorize('business.customers'), controller.createLoyaltyTier);
router.put('/loyalty-tiers/:id', requireAnyFeature('crm_pro', 'marketing_pro'), authorize('business.customers'), controller.updateLoyaltyTier);
router.post('/loyalty-tiers/assign/:customerId', requireAnyFeature('crm_pro', 'marketing_pro'), authorize('business.customers'), controller.assignLoyaltyTier);

router.post('/referrals', requireAnyFeature('crm_pro', 'marketing_pro'), authorize('business.customers'), controller.createReferral);
router.post('/referrals/redeem', requireAnyFeature('crm_pro', 'marketing_pro'), authorize('business.customers', 'business.pos'), controller.redeemReferral);

// Affiliate click tracking (tenant-scoped; public storefront may call with tenant resolved)
router.post('/affiliates/track', requireAnyFeature('marketing_pro', 'crm_pro'), controller.trackAffiliate);

module.exports = router;
