import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Button, Alert, Grid, Stack, Typography, Chip,
} from '@mui/material';
import { RocketLaunch } from '@mui/icons-material';
import { register as registerAction } from '../../features/auth/authSlice';
import RHFTextField from '../../components/RHFTextField';
import AuthPasswordField from '../../components/AuthPasswordField';
import AuthLayout, { AuthLink } from '../../layouts/AuthLayout';

const TRIAL_PERKS = ['14-day free trial', 'No credit card', 'Cancel anytime'];

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    const result = await dispatch(registerAction({
      businessName: data.businessName,
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
    }));
    setLoading(false);
    if (registerAction.fulfilled.match(result)) {
      localStorage.setItem('tenantSlug', result.payload.tenant?.slug);
      navigate('/dashboard');
    } else {
      setError(result.payload || 'Registration failed');
    }
  };

  return (
    <AuthLayout
      title="Start your free trial"
      subtitle="Create your business account and launch POS, inventory, and online shop in minutes."
      maxWidth={520}
      footer={(
        <Typography variant="body2" color="text.secondary">
          Already have an account? <AuthLink to="/login">Sign in</AuthLink>
        </Typography>
      )}
    >
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3, gap: 1 }}>
        {TRIAL_PERKS.map((perk) => (
          <Chip key={perk} label={perk} size="small" color="primary" variant="outlined" />
        ))}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <RHFTextField
              register={register}
              name="businessName"
              rules={{ required: 'Business name is required' }}
              label="Business name"
              error={!!errors.businessName}
              helperText={errors.businessName?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <RHFTextField
              register={register}
              name="firstName"
              rules={{ required: 'First name is required' }}
              label="First name"
              error={!!errors.firstName}
              helperText={errors.firstName?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <RHFTextField
              register={register}
              name="lastName"
              rules={{ required: 'Last name is required' }}
              label="Last name"
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
            />
          </Grid>
          <Grid item xs={12}>
            <RHFTextField
              register={register}
              name="email"
              rules={{ required: 'Email is required' }}
              label="Work email"
              type="email"
              autoComplete="email"
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          </Grid>
          <Grid item xs={12}>
            <RHFTextField register={register} name="phone" label="Phone (optional)" type="tel" />
          </Grid>
          <Grid item xs={12}>
            <AuthPasswordField
              register={register}
              name="password"
              rules={{ required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } }}
              label="Password"
              autoComplete="new-password"
              error={!!errors.password}
              helperText={errors.password?.message || 'Minimum 8 characters'}
            />
          </Grid>
        </Grid>

        <Button
          fullWidth
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          startIcon={<RocketLaunch />}
          sx={{ py: 1.4, mt: 3 }}
        >
          {loading ? 'Creating account…' : 'Create business account'}
        </Button>

        <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ mt: 2 }}>
          By signing up you agree to our terms of service and privacy policy.
        </Typography>
      </form>
    </AuthLayout>
  );
}
