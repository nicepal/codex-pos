import { useQuery } from '@tanstack/react-query';
import api from '../../../../services/api';

export default function useDashboardOverview(range = '30d') {
  return useQuery({
    queryKey: ['dashboard-overview', range],
    queryFn: () => api.get('/reports/dashboard-overview', { params: { range } }).then((r) => r.data.data),
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
