import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { formatMoney } from '../utils/currency';

export default function useBusinessCurrency() {
  const tenantCurrency = useSelector((s) => s.auth.tenant?.currency);

  const { data: settings } = useQuery({
    queryKey: ['business-settings'],
    queryFn: () => api.get('/settings').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const currency = (settings?.profile?.currency || tenantCurrency || 'USD').toUpperCase();
  const fmt = (amount) => formatMoney(amount, currency);

  return { currency, formatMoney: fmt };
}
