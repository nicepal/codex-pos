import { useState } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Button, Alert, Stack, TextField, Typography,
} from '@mui/material';
import { CheckCircle, ArrowBack } from '@mui/icons-material';
import api from '../../services/api';
import AuthLayout, { AuthLink } from '../../layouts/AuthLayout';
import AuthPasswordField from '../../components/AuthPasswordField';
import { useForm } from 'react-hook-form';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const password = watch('password', '');

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token && !done) {
    return (
      <AuthLayout
        title="Invalid reset link"
        subtitle="This password reset link is missing or has expired."
        footer={<AuthLink to="/forgot-password">Request a new link</AuthLink>}
      >
        <Alert severity="warning">
          Please request a new password reset from the forgot password page.
        </Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={done ? 'Password updated' : 'Set new password'}
      subtitle={done
        ? 'Your password has been changed. You can now sign in with your new credentials.'
        : 'Choose a strong password with at least 8 characters.'}
      footer={done ? (
        <Button component={RouterLink} to="/login" variant="contained" fullWidth size="large" sx={{ py: 1.4 }}>
          Continue to sign in
        </Button>
      ) : (
        <AuthLink to="/login">
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
            <ArrowBack sx={{ fontSize: 16 }} />
            <span>Back to sign in</span>
          </Stack>
        </AuthLink>
      )}
    >
      {done ? (
        <Stack spacing={3} alignItems="center" sx={{ py: 2 }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main' }} />
          <Alert severity="success" sx={{ width: '100%' }}>
            Password updated successfully.
          </Alert>
        </Stack>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}
            <AuthPasswordField
              register={register}
              name="password"
              rules={{
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
              }}
              label="New password"
              autoComplete="new-password"
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <TextField
              fullWidth
              label="Confirm password"
              type="password"
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (v) => v === password || 'Passwords do not match',
              })}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ py: 1.4 }}
            >
              {loading ? 'Updating…' : 'Update password'}
            </Button>
          </Stack>
        </form>
      )}
    </AuthLayout>
  );
}
