import { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { formatMoney, resolveCurrency, moneyFieldLabel } from '../utils/currency';

const BusinessCurrencyContext = createContext(null);

export { BusinessCurrencyContext };

export function BusinessCurrencyProvider({ children }) {
  const tenantCurrency = useSelector((s) => s.auth.tenant?.currency);

  const { data: settings, isLoading, isFetching } = useQuery({
    queryKey: ['business-settings'],
    queryFn: () => api.get('/settings').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const value = useMemo(() => {
    const currency = resolveCurrency(settings?.profile?.currency, tenantCurrency);
    return {
      currency,
      formatMoney: (amount) => formatMoney(amount, currency),
      moneyLabel: (label) => moneyFieldLabel(label, currency),
      isLoading: isLoading && !settings,
      isFetching,
    };
  }, [settings?.profile?.currency, tenantCurrency, isLoading, isFetching, settings]);

  return (
    <BusinessCurrencyContext.Provider value={value}>
      {children}
    </BusinessCurrencyContext.Provider>
  );
}

export function useBusinessCurrencyContext() {
  const ctx = useContext(BusinessCurrencyContext);
  if (!ctx) {
    throw new Error('useBusinessCurrency must be used within BusinessCurrencyProvider');
  }
  return ctx;
}
