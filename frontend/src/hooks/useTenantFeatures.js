import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const DEFAULT_FEATURES = {
  pos_pro: false,
  catalog_pro: false,
  tax_advanced: false,
  inventory_pro: false,
  staff_pro: false,
  crm_pro: false,
  omnichannel: false,
  allow_negative_stock: false,
  open_price_items: false,
};

export default function useTenantFeatures() {
  const { data, isLoading } = useQuery({
    queryKey: ['business-settings'],
    queryFn: () => api.get('/settings').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const features = { ...DEFAULT_FEATURES, ...(data?.features || {}) };
  const packs = data?.feature_packs || {};

  const hasFeature = (key) => Boolean(features[key]);

  return { features, packs, hasFeature, isLoading };
}
