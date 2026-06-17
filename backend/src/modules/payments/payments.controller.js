const paymentsService = require('./payments.service');
const { success, created } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

class PaymentsController {
  createCheckout = asyncHandler(async (req, res) => {
    const { plan_id: planId, billing_cycle: billingCycle } = req.body;
    const session = await paymentsService.createCheckoutSession(req.tenant.id, planId, billingCycle);
    return created(res, session, 'Checkout session created');
  });

  getCheckout = asyncHandler(async (req, res) => {
    const session = await paymentsService.getCheckoutSession(req.tenant.id, req.params.id);
    return success(res, session);
  });

  confirmCheckout = asyncHandler(async (req, res) => {
    const { session_id: sessionId, payment_reference: paymentReference } = req.body;
    const reference = paymentReference || `sim_${Date.now()}`;
    const result = await paymentsService.completeCheckoutSession(sessionId, reference);
    return success(res, result, 'Payment confirmed');
  });

  webhook = asyncHandler(async (req, res) => {
    const result = await paymentsService.handleWebhook(req.body, req.headers, req.rawBody);
    return success(res, result);
  });

  publicConfig = asyncHandler(async (req, res) => {
    return success(res, paymentsService.getPublicConfig());
  });
}

module.exports = new PaymentsController();
