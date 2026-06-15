import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, Container,
} from '@mui/material';
import { login, selectAuth } from '../../features/auth/authSlice';
import { useEffect, useState } from 'react';
import { selectIsPlatformAdmin } from '../../features/auth/authSlice';

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
    <Container maxWidth="sm">
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" align="center" gutterBottom fontWeight={700} color="primary">
              EYZ POS
            </Typography>
            <Typography align="center" color="text.secondary" sx={{ mb: 3 }}>
              {mfaRequired ? 'Enter your authenticator code' : 'Sign in to your account'}
            </Typography>
            {error && error.code !== 'MFA_REQUIRED' && (
              <Alert severity="error" sx={{ mb: 2 }}>{error.message || error}</Alert>
            )}
            {mfaRequired && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Multi-factor authentication is enabled for this account.
              </Alert>
            )}
            <form onSubmit={handleSubmit(onSubmit)}>
              {!mfaRequired && (
                <>
                  <TextField fullWidth label="Email" margin="normal" {...register('email', { required: true })} error={!!errors.email} />
                  <TextField fullWidth label="Password" type="password" margin="normal" {...register('password', { required: true })} error={!!errors.password} />
                </>
              )}
              {mfaRequired && (
                <TextField
                  fullWidth
                  label="Authenticator Code"
                  margin="normal"
                  autoFocus
                  inputProps={{ maxLength: 6, inputMode: 'numeric' }}
                  {...register('mfaToken', { required: true, minLength: 6, maxLength: 6 })}
                  error={!!errors.mfaToken}
                />
              )}
              <Button fullWidth type="submit" variant="contained" size="large" sx={{ mt: 2 }} disabled={loading}>
                {loading ? 'Signing in...' : mfaRequired ? 'Verify & Sign In' : 'Sign In'}
              </Button>
              {mfaRequired && (
                <Button
                  fullWidth
                  variant="text"
                  sx={{ mt: 1 }}
                  onClick={() => {
                    setMfaRequired(false);
                    setValue('mfaToken', '');
                  }}
                >
                  Back to password
                </Button>
              )}
            </form>
            {!mfaRequired && (
              <Typography align="center" sx={{ mt: 2 }}>
                Don't have an account? <Link to="/register">Register your business</Link>
                <Typography variant="body2" sx={{ mt: 1 }}><Link to="/forgot-password">Forgot password?</Link></Typography>
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
