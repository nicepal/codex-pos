const crypto = require('crypto');
const config = require('../../../config');
const logger = require('../../../utils/logger');

const STRIPE_API = 'https://api.stripe.com/v1';

function isConfigured() {
  return Boolean(config.payments.stripeSecretKey);
}

function encodeForm(obj, prefix, out = []) {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object' && !Array.isArray(value)) {
      encodeForm(value, fullKey, out);
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (typeof v === 'object') encodeForm(v, `${fullKey}[${i}]`, out);
        else out.push(`${encodeURIComponent(`${fullKey}[${i}]`)}=${encodeURIComponent(v)}`);
      });
    } else {
      out.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(value)}`);
    }
  }
  return out;
}

async function stripeRequest(path, params) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.payments.stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: encodeForm(params).join('&'),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Stripe request failed');
  }
  return data;
}

/**
 * Creates a hosted Stripe Checkout Session. Digital wallets (Apple/Google Pay)
 * and BNPL methods are enabled automatically by Stripe based on the account
 * configuration when using `automatic_payment_methods`-style checkout.
 */
async function createCheckout({ amount, currency, description, successUrl, cancelUrl, metadata }) {
  const session = await stripeRequest('/checkout/sessions', {
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: Math.round(Number(amount) * 100),
          product_data: { name: description || 'Payment' },
        },
      },
    ],
    metadata: metadata || {},
  });
  return {
    externalSessionId: session.id,
    checkoutUrl: session.url,
    paymentIntent: session.payment_intent || null,
  };
}

async function retrieveCheckout(externalSessionId) {
  const res = await fetch(`${STRIPE_API}/checkout/sessions/${externalSessionId}`, {
    headers: { Authorization: `Bearer ${config.payments.stripeSecretKey}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Stripe retrieve failed');
  return {
    paid: data.payment_status === 'paid',
    paymentIntent: data.payment_intent,
    status: data.status,
  };
}

/**
 * Verifies a Stripe webhook signature (t=...,v1=...) against the signing secret.
 */
function verifyWebhook(rawBody, signatureHeader) {
  const secret = config.payments.webhookSecret;
  if (!secret || !signatureHeader) return false;
  try {
    const parts = Object.fromEntries(
      signatureHeader.split(',').map((kv) => kv.split('='))
    );
    const timestamp = parts.t;
    const signature = parts.v1;
    if (!timestamp || !signature) return false;
    const signedPayload = `${timestamp}.${typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody)}`;
    const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch (err) {
    logger.warn('Stripe webhook verification error', { error: err.message });
    return false;
  }
}

module.exports = { isConfigured, createCheckout, retrieveCheckout, verifyWebhook };
