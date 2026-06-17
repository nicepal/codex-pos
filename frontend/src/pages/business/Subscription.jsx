import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Divider, List, ListItem, ListItemIcon, ListItemText,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { CheckCircle, CreditCard, Store, Inventory2, Groups } from '@mui/icons-material';
import api from '../../services/api';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import { formatDisplayText } from '../../utils/displayText';

function formatLimit(value) {
  if (value === -1 || value === null || value === undefined) return 'Unlimited';
  return String(value);
}

function annualSavingsPercent(monthly, annual) {
  const m = parseFloat(monthly);
  const a = parseFloat(annual);
  if (!Number.isFinite(m) || !Number.isFinite(a) || m <= 0) return 0;
  const yearlyFromMonthly = m * 12;
  if (yearlyFromMonthly <= a) return 0;
  return Math.round((1 - a / yearlyFromMonthly) * 100);
}

export default function SubscriptionPage() {
  const { currency, formatMoney } = useBusinessCurrency();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [checkout, setCheckout] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const {
    data: current,
    isLoading: currentLoading,
    isError: currentError,
    error: currentQueryError,
    refetch: refetchCurrent,
  } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.get('/subscriptions/current').then((r) => r.data.data),
  });

  const {
    data: plans,
    isLoading: plansLoading,
    isError: plansError,
    error: plansQueryError,
    refetch: refetchPlans,
  } = useQuery({
    queryKey: ['plans', 'subscription'],
    queryFn: () => api.get('/plans', { params: { limit: 50, status: 'active' } }).then((r) => r.data.data),
  });

  const planList = Array.isArray(plans) ? plans : [];
  const loading = currentLoading || plansLoading;

  const startCheckout = async (planId, planName) => {
    setError('');
    try {
      const { data } = await api.post('/subscriptions/checkout', {
        plan_id: planId,
        billing_cycle: billingCycle,
      });
      setCheckout({
        ...data.data,
        billing_cycle: billingCycle,
        plan_name: planName,
      });
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

  if (loading) {
    return <LoadingState message="Loading subscription details..." />;
  }

  const fetchError = plansError
    ? (plansQueryError?.response?.data?.message || 'Could not load available plans.')
    : currentError
      ? (currentQueryError?.response?.data?.message || 'Could not load your subscription.')
      : '';

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>My Subscription</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        View your current plan and upgrade to unlock more branches, products, and features. Prices are shown in {currency}.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {fetchError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={(
            <Button color="inherit" size="small" onClick={() => { refetchPlans(); refetchCurrent(); }}>
              Retry
            </Button>
          )}
        >
          {fetchError}
        </Alert>
      )}

      {current ? (
        <Card sx={{ mb: 3 }} variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Typography variant="h6">{current.plan_name || 'Current plan'}</Typography>
              <Chip label={formatDisplayText(current.status)} color="primary" size="small" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Billing cycle: {formatDisplayText(current.billing_cycle || 'monthly')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Renews: {current.current_period_end ? new Date(current.current_period_end).toLocaleDateString() : '—'}
            </Typography>
          </CardContent>
        </Card>
      ) : !currentError && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No active subscription record found. Choose a plan below to upgrade.
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>Available Plans</Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={billingCycle}
          onChange={(_, value) => value && setBillingCycle(value)}
          aria-label="billing cycle"
        >
          <ToggleButton value="monthly">Monthly</ToggleButton>
          <ToggleButton value="annual">Yearly</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {billingCycle === 'annual' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Pay yearly and save compared to 12 monthly payments on most plans.
        </Alert>
      )}

      {planList.length === 0 ? (
        <EmptyState
          illustration="business"
          title="No plans available"
          message="Subscription plans are not configured yet. Please contact your platform administrator or try again later."
          actionLabel="Refresh"
          onAction={() => refetchPlans()}
        />
      ) : (
        <Grid container spacing={2}>
          {planList.map((p) => {
            const isSamePlan = current?.plan_id === p.id;
            const currentCycle = current?.billing_cycle || 'monthly';
            const isCurrentSelection = isSamePlan && currentCycle === billingCycle;
            const price = billingCycle === 'annual' ? p.annual_price : p.monthly_price;
            const savings = billingCycle === 'annual' ? annualSavingsPercent(p.monthly_price, p.annual_price) : 0;
            const hasAnnual = parseFloat(p.annual_price) > 0;

            return (
              <Grid item xs={12} md={4} key={p.id}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    borderColor: isCurrentSelection ? 'primary.main' : 'divider',
                    boxShadow: isCurrentSelection ? 2 : 0,
                  }}
                >
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, gap: 1 }}>
                      <Typography fontWeight={700} variant="h6">{p.name}</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                        {isCurrentSelection && <Chip label="Current" size="small" color="primary" />}
                        {billingCycle === 'annual' && savings > 0 && (
                          <Chip label={`Save ${savings}%`} size="small" color="success" variant="outlined" />
                        )}
                      </Box>
                    </Box>
                    <Typography variant="h4" color="primary" fontWeight={700}>
                      {formatMoney(price)}
                      <Typography component="span" variant="body2" color="text.secondary">
                        {billingCycle === 'annual' ? '/year' : '/mo'}
                      </Typography>
                    </Typography>
                    {billingCycle === 'annual' && hasAnnual && (
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                        {formatMoney(parseFloat(p.annual_price) / 12)}/mo billed annually
                      </Typography>
                    )}
                    {billingCycle === 'monthly' && hasAnnual && (
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                        or {formatMoney(p.annual_price)}/year
                      </Typography>
                    )}

                    <List dense disablePadding sx={{ mb: 2, flex: 1 }}>
                      <ListItem disableGutters>
                        <ListItemIcon sx={{ minWidth: 32 }}><Inventory2 fontSize="small" color="action" /></ListItemIcon>
                        <ListItemText primary={`${formatLimit(p.product_limit)} products`} />
                      </ListItem>
                      <ListItem disableGutters>
                        <ListItemIcon sx={{ minWidth: 32 }}><Groups fontSize="small" color="action" /></ListItemIcon>
                        <ListItemText primary={`${formatLimit(p.user_limit)} users`} />
                      </ListItem>
                      <ListItem disableGutters>
                        <ListItemIcon sx={{ minWidth: 32 }}><Store fontSize="small" color="action" /></ListItemIcon>
                        <ListItemText primary={`${formatLimit(p.branch_limit)} branches`} />
                      </ListItem>
                    </List>

                    <Divider sx={{ mb: 2 }} />

                    <Button
                      fullWidth
                      variant={isCurrentSelection ? 'outlined' : 'contained'}
                      startIcon={isCurrentSelection ? <CheckCircle /> : <CreditCard />}
                      onClick={() => startCheckout(p.id, p.name)}
                      disabled={isCurrentSelection || (billingCycle === 'annual' && !hasAnnual)}
                    >
                      {isCurrentSelection
                        ? 'Current plan'
                        : isSamePlan
                          ? `Switch to ${billingCycle === 'annual' ? 'yearly' : 'monthly'}`
                          : 'Upgrade'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog open={!!checkout} onClose={() => setCheckout(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Complete Payment</DialogTitle>
        <DialogContent>
          <Typography gutterBottom fontWeight={600}>
            {checkout?.plan_name} — {checkout?.billing_cycle === 'annual' ? 'Yearly' : 'Monthly'} billing
          </Typography>
          <Typography gutterBottom>
            Total: {formatMoney(checkout?.amount)}
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
