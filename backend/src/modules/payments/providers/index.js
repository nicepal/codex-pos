const config = require('../../../config');
const stripe = require('./stripe.provider');

/**
 * Resolves the active payment provider. Falls back to the simulated `stub`
 * provider when no real gateway is configured, so checkout always works in
 * development and for self-hosted demos.
 */
function resolveProvider() {
  if (config.payments.provider === 'stripe' && stripe.isConfigured()) {
    return { name: 'stripe', ...stripe };
  }
  return { name: 'stub', ...stubProvider };
}

const stubProvider = {
  isConfigured: () => true,
  async createCheckout({ amount, successUrl }) {
    return {
      externalSessionId: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      checkoutUrl: successUrl,
      paymentIntent: null,
    };
  },
  async retrieveCheckout() {
    return { paid: true, paymentIntent: null, status: 'complete' };
  },
  verifyWebhook(rawBody, secretHeader) {
    return Boolean(config.payments.webhookSecret) && secretHeader === config.payments.webhookSecret;
  },
};

module.exports = { resolveProvider };
