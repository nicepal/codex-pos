const config = require('../../../config');
const stripe = require('./stripe.provider');
const { ValidationError } = require('../../../shared/errors');

/**
 * Resolves the active payment provider. Stub is allowed in non-production
 * (or with ALLOW_PAYMENT_STUB). Production + PAYMENT_PROVIDER=stripe requires Stripe keys.
 */
function resolveProvider() {
  const name = config.payments.provider || 'stub';

  if (name === 'stripe') {
    if (stripe.isConfigured()) {
      return { name: 'stripe', ...stripe };
    }
    if (config.env === 'production' && process.env.ALLOW_PAYMENT_STUB !== 'true') {
      throw new ValidationError(
        'PAYMENT_PROVIDER=stripe but STRIPE_SECRET_KEY is not configured'
      );
    }
    // Dev fallback only
    return { name: 'stub', ...stubProvider };
  }

  if (name === 'stub') {
    if (config.env === 'production' && process.env.ALLOW_PAYMENT_STUB !== 'true') {
      throw new ValidationError(
        'Stub payment provider is disabled in production. Set PAYMENT_PROVIDER=stripe or ALLOW_PAYMENT_STUB=true'
      );
    }
    return { name: 'stub', ...stubProvider };
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
