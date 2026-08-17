import api from './api';

const onboardingService = {
  getBusinessTypes: () => api.get('/onboarding/business-types').then((r) => r.data.data),
  getStatus: () => api.get('/onboarding/status').then((r) => r.data.data),
  selectBusinessType: (businessType) =>
    api.post('/onboarding/select-business-type', { business_type: businessType }).then((r) => r.data.data),
  runSetup: () => api.post('/onboarding/setup').then((r) => r.data.data),
  skip: () => api.post('/onboarding/skip').then((r) => r.data.data),
};

export function needsOnboarding(tenantOrStatus) {
  const status = typeof tenantOrStatus === 'string'
    ? tenantOrStatus
    : tenantOrStatus?.onboarding_status;
  if (!status) return false;
  return status === 'not_started' || status === 'in_progress' || status === 'failed';
}

export default onboardingService;
