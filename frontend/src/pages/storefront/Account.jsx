import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab, Alert, Stack, Divider, Chip,
} from '@mui/material';
import storefrontApi, { getStoreToken, setStoreToken, clearStoreToken } from '../../services/storefrontApi';
import useStoreCurrency from '../../hooks/useStoreCurrency';

function AuthForms({ onAuthed }) {
  const [tab, setTab] = useState(0);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [reg, setReg] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submitLogin = async () => {
    setBusy(true); setError('');
    try {
      const res = await storefrontApi.post('/storefront/account/login', login);
      setStoreToken(res.data.data.token);
      onAuthed();
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally { setBusy(false); }
  };

  const submitRegister = async () => {
    setBusy(true); setError('');
    try {
      const res = await storefrontApi.post('/storefront/account/register', reg);
      setStoreToken(res.data.data.token);
      onAuthed();
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally { setBusy(false); }
  };

  return (
    <Card sx={{ maxWidth: 460, mx: 'auto' }}>
      <CardContent>
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); }} sx={{ mb: 2 }}>
          <Tab label="Sign in" />
          <Tab label="Create account" />
        </Tabs>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {tab === 0 ? (
          <Stack spacing={2}>
            <TextField label="Email" type="email" value={login.email} onChange={(e) => setLogin((s) => ({ ...s, email: e.target.value }))} />
            <TextField label="Password" type="password" value={login.password} onChange={(e) => setLogin((s) => ({ ...s, password: e.target.value }))} />
            <Button variant="contained" onClick={submitLogin} disabled={busy}>Sign in</Button>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField label="First name" fullWidth value={reg.first_name} onChange={(e) => setReg((s) => ({ ...s, first_name: e.target.value }))} />
              <TextField label="Last name" fullWidth value={reg.last_name} onChange={(e) => setReg((s) => ({ ...s, last_name: e.target.value }))} />
            </Stack>
            <TextField label="Email" type="email" value={reg.email} onChange={(e) => setReg((s) => ({ ...s, email: e.target.value }))} />
            <TextField label="Phone (optional)" value={reg.phone} onChange={(e) => setReg((s) => ({ ...s, phone: e.target.value }))} />
            <TextField label="Password" type="password" value={reg.password} onChange={(e) => setReg((s) => ({ ...s, password: e.target.value }))} />
            <Button variant="contained" onClick={submitRegister} disabled={busy}>Create account</Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

export default function StoreAccount() {
  const { basePath } = useOutletContext();
  const { formatMoney } = useStoreCurrency();
  const queryClient = useQueryClient();
  const [authed, setAuthed] = useState(Boolean(getStoreToken()));

  const { data: me } = useQuery({
    queryKey: ['storefront-me'],
    queryFn: () => storefrontApi.get('/storefront/account/me').then((r) => r.data.data),
    enabled: authed,
    retry: false,
  });

  const { data: orders } = useQuery({
    queryKey: ['storefront-my-orders'],
    queryFn: () => storefrontApi.get('/storefront/account/orders').then((r) => r.data.data),
    enabled: authed,
  });

  const { data: wishlist } = useQuery({
    queryKey: ['storefront-wishlist'],
    queryFn: () => storefrontApi.get('/storefront/account/wishlist').then((r) => r.data.data),
    enabled: authed,
  });

  useEffect(() => {
    if (authed) queryClient.invalidateQueries(['storefront-me']);
  }, [authed, queryClient]);

  const logout = () => { clearStoreToken(); setAuthed(false); };

  if (!authed) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography variant="h5" fontWeight={800} textAlign="center" gutterBottom>My Account</Typography>
        <AuthForms onAuthed={() => setAuthed(true)} />
      </Box>
    );
  }

  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>My Account</Typography>
          {me && <Typography color="text.secondary">{me.first_name} {me.last_name} · {me.email}</Typography>}
        </Box>
        <Button variant="outlined" onClick={logout}>Sign out</Button>
      </Stack>

      <Typography variant="h6" fontWeight={700} gutterBottom>Order history</Typography>
      <Stack spacing={1} sx={{ mb: 4 }}>
        {(orders || []).map((o) => (
          <Card key={o.id} variant="outlined">
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
              <Box>
                <Typography fontWeight={600}>{o.order_number}</Typography>
                <Typography variant="caption" color="text.secondary">{new Date(o.created_at).toLocaleString()}</Typography>
              </Box>
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip size="small" label={o.status} />
                <Typography fontWeight={700}>{formatMoney(o.total_amount)}</Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
        {orders && orders.length === 0 && <Typography color="text.secondary">No orders yet.</Typography>}
      </Stack>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h6" fontWeight={700} gutterBottom>Wishlist</Typography>
      <Stack spacing={1}>
        {(wishlist || []).map((w) => (
          <Box key={w.id} component={Link} to={`${basePath}/product/${w.slug}`} sx={{ textDecoration: 'none', color: 'inherit' }}>
            <Card variant="outlined">
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5 }}>
                <Typography>{w.name}</Typography>
                <Typography fontWeight={700}>{formatMoney(w.sale_price)}</Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
        {wishlist && wishlist.length === 0 && <Typography color="text.secondary">Your wishlist is empty.</Typography>}
      </Stack>
    </Box>
  );
}
