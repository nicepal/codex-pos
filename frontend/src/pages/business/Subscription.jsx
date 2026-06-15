import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert,
} from '@mui/material';
import api from '../../services/api';

export default function SubscriptionPage() {
  const [checkout, setCheckout] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const { data: current, refetch: refetchCurrent } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.get('/subscriptions/current').then((r) => r.data.data),
  });

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then((r) => r.data.data),
  });

  const startCheckout = async (planId) => {
    setError('');
    try {
      const { data } = await api.post('/subscriptions/checkout', {
        plan_id: planId,
        billing_cycle: 'monthly',
      });
      setCheckout(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start checkout');
    }
  };

  const confirmPayment = async () => {
    if (!checkout?.session_id) return;
    setConfirming(true);
    setError('');
    try {
      await api.post('/subscriptions/confirm', { session_id: checkout.session_id });
      setCheckout(null);
      await refetchCurrent();
    } catch (err) {
      setError(err.response?.data?.message || 'Payment confirmation failed');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>My Subscription</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {current && (
        <Card sx={{ mb: 3 }}><CardContent>
          <Typography variant="h6">{current.plan_name}</Typography>
          <Chip label={current.status} color="primary" size="small" sx={{ my: 1 }} />
          <Typography>Renews: {current.current_period_end ? new Date(current.current_period_end).toLocaleDateString() : '-'}</Typography>
        </CardContent></Card>
      )}
      <Typography variant="h6" gutterBottom>Available Plans</Typography>
      <Grid container spacing={2}>
        {(plans || []).map((p) => (
          <Grid item xs={12} md={4} key={p.id}>
            <Card><CardContent>
              <Typography fontWeight={700}>{p.name}</Typography>
              <Typography variant="h5" color="primary">${p.monthly_price}/mo</Typography>
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => startCheckout(p.id)}
                disabled={current?.plan_id === p.id}
              >
                Upgrade
              </Button>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={!!checkout} onClose={() => setCheckout(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Complete Payment</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Plan upgrade — ${checkout?.amount} {checkout?.currency}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            In production this redirects to a payment provider. For development, confirm the simulated payment below.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckout(null)}>Cancel</Button>
          <Button variant="contained" onClick={confirmPayment} disabled={confirming}>
            {confirming ? 'Processing...' : 'Confirm Payment (Dev)'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
