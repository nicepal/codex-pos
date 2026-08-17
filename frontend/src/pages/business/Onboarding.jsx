import { Navigate } from 'react-router-dom';

/** Legacy path — smart onboarding lives at /onboarding */
export default function OnboardingPage() {
  return <Navigate to="/onboarding" replace />;
}
