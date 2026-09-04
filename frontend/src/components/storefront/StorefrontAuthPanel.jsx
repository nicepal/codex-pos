import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab, Alert, Stack,
} from '@mui/material';
import { useStorefrontCustomer } from '../../hooks/useStorefrontCustomer';
import PasswordField from '../PasswordField';

/**
 * Shop customer sign-in / register panel (storefront only — not business login).
 */
export default function StorefrontAuthPanel({
  onAuthed,
  title = 'Sign in to continue',
  subtitle = 'Use your account for this store',
  compact = false,
  defaultTab = 0,
}) {
  const { login, register } = useStorefrontCustomer();
  const [tab, setTab] = useState(defaultTab);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [reg, setReg] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const finish = () => {
    onAuthed?.();
  };

  const submitLogin = async () => {
    setBusy(true);
    setError('');
    try {
      await login(loginForm);
      finish();
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const submitRegister = async () => {
    setBusy(true);
    setError('');
    try {
      await register(reg);
      finish();
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  const body = (
    <>
      {(title || subtitle) ? (
        <Box sx={{ mb: 2 }}>
          {title ? (
            <Typography fontWeight={800} sx={{ fontSize: compact ? 16 : 20 }}>
              {title}
            </Typography>
          ) : null}
          {subtitle ? (
            <Typography color="text.secondary" sx={{ fontSize: 13.5, mt: 0.25 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      ) : null}
      <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); }} sx={{ mb: 2 }}>
        <Tab label="Sign in" />
        <Tab label="Create account" />
      </Tabs>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {tab === 0 ? (
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            size={compact ? 'small' : 'medium'}
            value={loginForm.email}
            onChange={(e) => setLoginForm((s) => ({ ...s, email: e.target.value }))}
            fullWidth
          />
          <PasswordField
            label="Password"
            size={compact ? 'small' : 'medium'}
            value={loginForm.password}
            onChange={(e) => setLoginForm((s) => ({ ...s, password: e.target.value }))}
            fullWidth
            onKeyDown={(e) => e.key === 'Enter' && submitLogin()}
          />
          <Button variant="contained" onClick={submitLogin} disabled={busy} fullWidth={compact}>
            Sign in
          </Button>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="First name"
              size={compact ? 'small' : 'medium'}
              fullWidth
              value={reg.first_name}
              onChange={(e) => setReg((s) => ({ ...s, first_name: e.target.value }))}
            />
            <TextField
              label="Last name"
              size={compact ? 'small' : 'medium'}
              fullWidth
              value={reg.last_name}
              onChange={(e) => setReg((s) => ({ ...s, last_name: e.target.value }))}
            />
          </Stack>
          <TextField
            label="Email"
            type="email"
            size={compact ? 'small' : 'medium'}
            fullWidth
            value={reg.email}
            onChange={(e) => setReg((s) => ({ ...s, email: e.target.value }))}
          />
          <TextField
            label="Phone (optional)"
            size={compact ? 'small' : 'medium'}
            fullWidth
            value={reg.phone}
            onChange={(e) => setReg((s) => ({ ...s, phone: e.target.value }))}
          />
          <PasswordField
            label="Password"
            size={compact ? 'small' : 'medium'}
            fullWidth
            value={reg.password}
            onChange={(e) => setReg((s) => ({ ...s, password: e.target.value }))}
            helperText="At least 6 characters"
          />
          <Button variant="contained" onClick={submitRegister} disabled={busy} fullWidth={compact}>
            Create account
          </Button>
        </Stack>
      )}
    </>
  );

  if (compact) {
    return <Box sx={{ maxWidth: 420 }}>{body}</Box>;
  }

  return (
    <Card sx={{ maxWidth: 460, mx: 'auto' }} variant="outlined">
      <CardContent>{body}</CardContent>
    </Card>
  );
}
