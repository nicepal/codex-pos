export const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'PKR', 'AED', 'SAR'];

const LOCALE_BY_CURRENCY = {
  PKR: 'en-PK',
  AED: 'en-AE',
  SAR: 'ar-SA',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

export function resolveCurrency(settingsCurrency, tenantCurrency, fallback = 'USD') {
  const code = settingsCurrency || tenantCurrency || fallback;
  return (code || fallback).toUpperCase();
}

export function formatMoney(amount, currencyCode = 'USD') {
  const code = resolveCurrency(currencyCode);
  const value = Number(amount);
  const safe = Number.isFinite(value) ? value : 0;

  try {
    const locale = LOCALE_BY_CURRENCY[code] || 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `${code} ${safe.toFixed(2)}`;
  }
}

/** Parse a payment/amount field; empty or non-finite → 0. */
export function safeNumber(value) {
  if (value === '' || value == null) return 0;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(n) ? n : 0;
}

/** Round to 2 decimal places to avoid float noise (e.g. 0.0000001). */
export function roundMoney(value) {
  return Math.round((safeNumber(value) + Number.EPSILON) * 100) / 100;
}

export function moneyFieldLabel(label, currencyCode) {
  return `${label} (${resolveCurrency(currencyCode)})`;
}
