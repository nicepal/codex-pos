import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { formatMoney, resolveCurrency } from '../utils/currency';
import { useStorefrontUI } from '../contexts/StorefrontUIContext';

export default function useStoreCurrency() {
  const ctx = useOutletContext() || {};
  const ui = useStorefrontUI() || {};
  const slug = ctx.slug;
  const contextCurrency = ctx.currency || ui.currency;

  const { data: theme } = useQuery({
    queryKey: ['storefront-theme', slug],
    queryFn: () => api.get('/storefront/theme').then((r) => r.data.data),
    enabled: !!slug && !contextCurrency,
    staleTime: 5 * 60 * 1000,
  });

  const currency = resolveCurrency(theme?.currency, contextCurrency);
  const fmt = (amount) => formatMoney(amount, currency);

  return { currency, formatMoney: fmt };
}
