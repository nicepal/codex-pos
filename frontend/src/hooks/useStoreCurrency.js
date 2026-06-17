import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { formatMoney, resolveCurrency } from '../utils/currency';

export default function useStoreCurrency() {
  const ctx = useOutletContext() || {};
  const slug = ctx.slug;

  const { data: theme } = useQuery({
    queryKey: ['storefront-theme', slug],
    queryFn: () => api.get('/storefront/theme').then((r) => r.data.data),
    enabled: !!slug && !ctx.currency,
    staleTime: 5 * 60 * 1000,
  });

  const currency = resolveCurrency(theme?.currency, ctx.currency);
  const fmt = (amount) => formatMoney(amount, currency);

  return { currency, formatMoney: fmt };
}
