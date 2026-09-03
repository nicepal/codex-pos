require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  host: process.env.HOST || '0.0.0.0',
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  db: {
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || process.env.CODEXPOS_DB_NAME || 'eyz_pos',
    user: process.env.DB_USER || process.env.CODEXPOS_DB_USER || 'eyz_user',
    password: process.env.DB_PASSWORD || process.env.CODEXPOS_DB_PASSWORD || 'eyz_password',
    min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
    max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    cookieMode: process.env.AUTH_COOKIE_MODE === 'true',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },

  app: {
    name: process.env.APP_NAME || 'Codex POS',
    url: process.env.APP_URL || 'http://localhost:3000',
    apiUrl: process.env.API_URL || 'http://localhost:5000',
    platformDomain: process.env.PLATFORM_DOMAIN || 'codexpos.store',
    storefrontDomain: process.env.STOREFRONT_DOMAIN || 'codexpos.store',
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'noreply@codexpos.store',
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || 'eyz-pos',
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    // Authenticated POS/dashboard traffic easily exceeds 100/15m (browse + polls).
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 2000,
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
  },

  upload: {
    signingSecret: process.env.UPLOAD_SIGNING_SECRET || process.env.JWT_ACCESS_SECRET,
    urlTtlSeconds: parseInt(process.env.UPLOAD_URL_TTL_SECONDS, 10) || 604800,
  },

  payments: {
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET,
    // Production defaults to stripe (must be configured). Stub only in non-production unless explicit.
    provider: process.env.PAYMENT_PROVIDER
      || (process.env.NODE_ENV === 'production' ? 'stripe' : 'stub'),
    // Simulated POST /payments/confirm — never on by default in production.
    allowStubConfirm: process.env.ALLOW_PAYMENT_STUB === 'true'
      || (process.env.NODE_ENV !== 'production' && process.env.PAYMENT_PROVIDER !== 'stripe'),
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    currency: process.env.PAYMENTS_DEFAULT_CURRENCY || 'USD',
  },

  sms: {
    provider: process.env.SMS_PROVIDER || 'none',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioFrom: process.env.TWILIO_FROM,
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM,
  },

  whatsapp: {
    provider: process.env.WHATSAPP_PROVIDER || 'none',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  },

  ai: {
    provider: process.env.AI_PROVIDER || 'heuristic',
    openaiApiKey: process.env.OPENAI_API_KEY,
    model: process.env.AI_MODEL || 'gpt-4o-mini',
  },

  realtime: {
    enabled: process.env.REALTIME_ENABLED !== 'false',
  },

  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || process.env.JWT_ACCESS_SECRET,
  },

  shopify: {
    apiVersion: process.env.SHOPIFY_API_VERSION || '2024-10',
  },

  bcryptRounds: 12,
};
