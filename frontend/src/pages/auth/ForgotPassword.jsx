import { useState } from 'react';
import {
  Button, Alert, Stack, Typography, TextField,
} from '@mui/material';
import { MarkEmailRead, ArrowBack } from '@mui/icons-material';
import api from '../../services/api';
import AuthLayout, { AuthLink } from '../../layouts/AuthLayout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={sent ? 'Check your inbox' : 'Forgot password?'}
      subtitle={sent
        ? `If an account exists for ${email}, we've sent password reset instructions.`
        : 'Enter your email and we\'ll send you a link to reset your password.'}
      footer={(
        <AuthLink to="/login">
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
            <ArrowBack sx={{ fontSize: 16 }} />
            <span>Back to sign in</span>
          </Stack>
        </AuthLink>
      )}
    >
      {sent ? (
        <Stack spacing={3} alignItems="center" sx={{ py: 2 }}>
          <MarkEmailRead sx={{ fontSize: 64, color: 'primary.main', opacity: 0.9 }} />
          <Alert severity="success" sx={{ width: '100%' }}>
            Reset link sent. Check your spam folder if you don&apos;t see it within a few minutes.
          </Alert>
          <Button variant="outlined" fullWidth onClick={() => { setSent(false); setEmail(''); }}>
            Try another email
          </Button>
        </Stack>
      ) : (
        <form onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              fullWidth
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading || !email.trim()}
              sx={{ py: 1.4 }}
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </Stack>
        </form>
      )}
    </AuthLayout>
  );
}
