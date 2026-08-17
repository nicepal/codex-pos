import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Stack, Typography, Alert, CircularProgress,
} from '@mui/material';
import { selectAuth, setTenantProfile } from '../../features/auth/authSlice';
import onboardingService, { needsOnboarding } from '../../services/onboardingService';
import BusinessTypeSelection from './components/BusinessTypeSelection';
import SetupConfirm from './components/SetupConfirm';
import SetupProgress from './components/SetupProgress';
import SetupComplete from './components/SetupComplete';

const STEPS = ['welcome', 'type', 'confirm', 'progress', 'complete'];

export default function OnboardingWizard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { tenant, user } = useSelector(selectAuth);
  const [step, setStep] = useState('welcome');
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const typeMeta = types.find((t) => t.id === selectedType) || null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [typeList, current] = await Promise.all([
          onboardingService.getBusinessTypes(),
          onboardingService.getStatus(),
        ]);
        if (cancelled) return;
        setTypes(typeList || []);
        setStatus(current);
        setProgress(current?.progress || null);
        if (current?.business_type) setSelectedType(current.business_type);

        if (current?.onboarding_status === 'completed') {
          setStep('complete');
          setResult(current);
        } else if (current?.onboarding_status === 'skipped') {
          navigate('/dashboard', { replace: true });
        } else if (current?.onboarding_status === 'failed') {
          setStep('confirm');
          setError(current?.progress?.error || 'Previous setup failed. You can retry safely.');
        } else if (current?.business_type) {
          setStep('confirm');
        } else {
          setStep('welcome');
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load onboarding');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const syncTenant = (nextStatus) => {
    if (!nextStatus) return;
    dispatch(setTenantProfile({
      business_type: nextStatus.business_type,
      onboarding_status: nextStatus.onboarding_status,
    }));
  };

  const handleContinueFromWelcome = () => setStep('type');

  const handleSelectType = async () => {
    if (!selectedType) {
      setError('Please select a business type');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const next = await onboardingService.selectBusinessType(selectedType);
      setStatus(next);
      syncTenant(next);
      setStep('confirm');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save business type');
    } finally {
      setBusy(false);
    }
  };

  const handleStartSetup = async () => {
    setStep('progress');
    setBusy(true);
    setError('');
    setProgress((p) => ({ ...(p || {}), message: 'Starting setup…', products_created: 0 }));

    const poll = setInterval(async () => {
      try {
        const s = await onboardingService.getStatus();
        setProgress(s.progress);
        setStatus(s);
      } catch {
        // ignore poll errors
      }
    }, 800);

    try {
      const setupResult = await onboardingService.runSetup();
      clearInterval(poll);
      setResult(setupResult);
      setProgress(setupResult.progress);
      syncTenant(setupResult);
      setStep('complete');
    } catch (err) {
      clearInterval(poll);
      const message = err.response?.data?.message || 'Setup failed. You can retry — duplicates are skipped.';
      setError(message);
      try {
        const s = await onboardingService.getStatus();
        setProgress(s.progress);
        setStatus(s);
        syncTenant(s);
      } catch {
        // ignore
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    setBusy(true);
    setError('');
    try {
      const next = await onboardingService.skip();
      syncTenant(next);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not skip onboarding');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={10}>
        <CircularProgress />
      </Box>
    );
  }

  // If somehow completed tenant hits this page after hydration mismatch
  if (tenant && !needsOnboarding(tenant) && step !== 'complete' && status?.onboarding_status === 'completed') {
    return <SetupComplete summary={status} />;
  }

  return (
    <Box>
      {error && step !== 'progress' && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>
      )}

      {step === 'welcome' && (
        <Box maxWidth={640} mx="auto">
          <Typography variant="h3" fontWeight={800} letterSpacing="-0.04em" gutterBottom>
            Welcome to Codex POS
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 1.5, fontSize: '1.1rem' }}>
            Hi{user?.first_name ? ` ${user.first_name}` : ''} — let&apos;s get {tenant?.name || 'your business'} ready to sell.
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Choose your business type and we&apos;ll create a starter catalog with real products and stock.
            No fake orders or revenue — just a clean foundation you can customize.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button variant="contained" size="large" onClick={handleContinueFromWelcome} sx={{ py: 1.4, px: 3 }}>
              Get started
            </Button>
            <Button variant="text" size="large" onClick={handleSkip} disabled={busy}>
              Skip for now
            </Button>
          </Stack>
        </Box>
      )}

      {step === 'type' && (
        <Box>
          <BusinessTypeSelection
            types={types}
            selected={selectedType}
            onSelect={setSelectedType}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }} justifyContent="space-between">
            <Button onClick={() => setStep('welcome')} disabled={busy}>Back</Button>
            <Stack direction="row" spacing={2}>
              <Button onClick={handleSkip} disabled={busy}>Skip setup</Button>
              <Button variant="contained" size="large" onClick={handleSelectType} disabled={busy || !selectedType}>
                {busy ? 'Saving…' : 'Continue'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      {step === 'confirm' && (
        <Box>
          <SetupConfirm
            businessType={selectedType}
            typeMeta={typeMeta || types.find((t) => t.id === status?.business_type)}
            onBack={() => setStep('type')}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }} justifyContent="center">
            <Button onClick={handleSkip} disabled={busy}>Skip — empty catalog</Button>
            <Button variant="contained" size="large" onClick={handleStartSetup} disabled={busy} sx={{ px: 4 }}>
              {busy ? 'Working…' : 'Create my starter catalog'}
            </Button>
          </Stack>
        </Box>
      )}

      {step === 'progress' && (
        <Box>
          <SetupProgress progress={progress} error={error} running={busy} />
          {error && !busy && (
            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
              <Button variant="contained" onClick={handleStartSetup}>Retry setup</Button>
              <Button onClick={handleSkip}>Skip instead</Button>
            </Stack>
          )}
        </Box>
      )}

      {step === 'complete' && (
        <SetupComplete summary={result || status} />
      )}

      {STEPS.includes(step) && step !== 'complete' && step !== 'progress' && (
        <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ mt: 6 }}>
          Step {Math.max(1, STEPS.indexOf(step))} of {STEPS.length - 2} · Codex POS smart onboarding
        </Typography>
      )}
    </Box>
  );
}
