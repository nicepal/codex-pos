import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Button, Alert, Stack, Typography } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { login, selectAuth, selectIsPlatformAdmin } from '../../features/auth/authSlice';
import { useEffect, useState } from 'react';
import RHFTextField from '../../components/RHFTextField';
import AuthPasswordField from '../../components/AuthPasswordField';
import AuthLayout, { AuthLink } from '../../layouts/AuthLayout';

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors }, getValues, setValue } = useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector(selectAuth);
  const isPlatformAdmin = useSelector(selectIsPlatformAdmin);
  const [mfaRequired, setMfaRequired] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(isPlatformAdmin ? '/admin' : '/dashboard');
    }
  }, [isAuthenticated, isPlatformAdmin, navigate]);

  const onSubmit = async (data) => {
    const payload = mfaRequired
      ? { email: getValues('email'), password: getValues('password'), mfaToken: data.mfaToken }
      : data;

    const result = await dispatch(login(payload));
    if (login.fulfilled.match(result)) {
      const roles = result.payload.user?.roles || [];
      const isAdmin = roles.some((r) => ['super_admin', 'support_agent', 'billing_manager'].includes(r));
      if (result.payload.tenant?.slug) {
        localStorage.setItem('tenantSlug', result.payload.tenant.slug);
      }
      navigate(isAdmin ? '/admin' : '/dashboard');
      return;
    }

    if (result.payload?.code === 'MFA_REQUIRED') {
      setMfaRequired(true);
    }
  };

  return (
    <AuthLayout
      title={mfaRequired ? 'Verify your identity' : 'Welcome back'}
      subtitle={mfaRequired
        ? 'Enter the 6-digit code from your authenticator app.'
        : 'Sign in to manage sales, inventory, and your online shop.'}
      footer={!mfaRequired && (
        <Typography variant="body2" color="text.secondary">
          Don&apos;t have an account?{' '}
          <AuthLink to="/register">Start free trial</AuthLink>
        </Typography>
      )}
    >
      {error && error.code !== 'MFA_REQUIRED' && (
        <Alert severity="error" sx={{ mb: 2.5 }}>{error.message || error}</Alert>
      )}
      {mfaRequired && (
        <Alert severity="info" sx={{ mb: 2.5 }}>
          Multi-factor authentication is enabled for this account.
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2}>
          {!mfaRequired && (
            <>
              <RHFTextField
                register={register}
                name="email"
                rules={{ required: 'Email is required' }}
                label="Email address"
                type="email"
                autoComplete="email"
                error={!!errors.email}
                helperText={errors.email?.message}
              />
              <AuthPasswordField
                register={register}
                name="password"
                rules={{ required: 'Password is required' }}
                label="Password"
                autoComplete="current-password"
                error={!!errors.password}
                helperText={errors.password?.message}
              />
              <Stack direction="row" justifyContent="flex-end">
                <AuthLink to="/forgot-password">Forgot password?</AuthLink>
              </Stack>
            </>
          )}
          {mfaRequired && (
            <RHFTextField
              register={register}
              name="mfaToken"
              rules={{ required: 'Code is required', minLength: 6, maxLength: 6 }}
              label="Authenticator code"
              autoFocus
              inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
              error={!!errors.mfaToken}
              helperText={errors.mfaToken?.message || '6-digit code from your app'}
            />
          )}

          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            endIcon={!loading && <ArrowForward />}
            sx={{ py: 1.4, mt: 0.5 }}
          >
            {loading ? 'Signing in…' : mfaRequired ? 'Verify & sign in' : 'Sign in'}
          </Button>

          {mfaRequired && (
            <Button
              fullWidth
              variant="text"
              onClick={() => {
                setMfaRequired(false);
                setValue('mfaToken', '');
              }}
            >
              Back to password
            </Button>
          )}
        </Stack>
      </form>
    </AuthLayout>
  );
}
