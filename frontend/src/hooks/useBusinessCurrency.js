import { useContext } from 'react';
import { useSelector } from 'react-redux';
import { BusinessCurrencyContext } from '../contexts/BusinessCurrencyContext';
import { formatMoney, resolveCurrency, moneyFieldLabel } from '../utils/currency';

export default function useBusinessCurrency() {
  const ctx = useContext(BusinessCurrencyContext);
  const tenantCurrency = useSelector((s) => s.auth.tenant?.currency);

  if (ctx) {
    return ctx;
  }

  const currency = resolveCurrency(null, tenantCurrency);
  return {
    currency,
    formatMoney: (amount) => formatMoney(amount, currency),
    moneyLabel: (label) => moneyFieldLabel(label, currency),
    isLoading: false,
    isFetching: false,
  };
}
