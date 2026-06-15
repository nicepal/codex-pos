const LOCALE_BY_CURRENCY = {
  PKR: 'en-PK',
  AED: 'en-AE',
  SAR: 'ar-SA',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

export function formatMoney(amount, currencyCode = 'USD') {
  const code = (currencyCode || 'USD').toUpperCase();
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
