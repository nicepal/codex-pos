import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuth, selectIsPlatformAdmin } from '../features/auth/authSlice';
import { needsOnboarding } from '../services/onboardingService';
import LoadingState from './LoadingState';

/**
 * Forces incomplete tenants into /onboarding (except when already there).
 * Existing tenants with completed/skipped/null status pass through.
 */
export default function OnboardingGate({ children }) {
  const { tenant, hydrating, isAuthenticated } = useSelector(selectAuth);
  const isPlatformAdmin = useSelector(selectIsPlatformAdmin);
  const location = useLocation();

  if (hydrating) return <LoadingState />;
  if (!isAuthenticated || isPlatformAdmin) return children;

  const onOnboarding = location.pathname.startsWith('/onboarding');
  if (needsOnboarding(tenant) && !onOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }
  if (!needsOnboarding(tenant) && onOnboarding && tenant?.onboarding_status === 'skipped') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
