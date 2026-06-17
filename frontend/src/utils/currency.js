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

export function moneyFieldLabel(label, currencyCode) {
  return `${label} (${resolveCurrency(currencyCode)})`;
}
