import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Box, Typography, TextField, Grid, Alert, MenuItem, Stack, Button, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import api from '../../services/api';
import { selectStoreCartTotal, clearStoreCart } from '../../features/storefront/cartSlice';
import OrderSummary from '../../components/storefront/OrderSummary';
import StoreBreadcrumbs from '../../components/storefront/StoreBreadcrumbs';
import { calcOrderTotals } from '../../utils/storefrontPricing';
import useStoreCurrency from '../../hooks/useStoreCurrency';

export default function CheckoutPage() {
  const { formatMoney } = useStoreCurrency();
  const { items } = useSelector((s) => s.storefrontCart);
  const subtotal = useSelector(selectStoreCartTotal);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { basePath } = useOutletContext();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', payment_method: 'cash',
    fulfillment_type: 'delivery', pickup_branch_id: '',
  });
  const { total } = calcOrderTotals(subtotal);

  const { data: branches } = useQuery({
    queryKey: ['storefront-branches'],
    queryFn: () => api.get('/storefront/branches').then((r) => r.data.data),
  });

  const checkout = useMutation({
    mutationFn: () => api.post('/storefront/checkout', {
      items: items.map((i) => ({
        product_id: i.product_id,
        product_name: i.name,
        quantity: i.quantity,
      })),
      customer_name: form.name.trim(),
      customer_email: form.email.trim() || undefined,
      customer_phone: form.phone.trim() || undefined,
      payment_method: form.payment_method,
      fulfillment_type: form.fulfillment_type,
      pickup_branch_id: form.fulfillment_type === 'pickup' ? (form.pickup_branch_id || undefined) : undefined,
    }),
    onSuccess: (res) => {
      dispatch(clearStoreCart());
      navigate(`${basePath}/order/confirm`, { state: { order: res.data.data } });
    },
  });

  const pickupInvalid = form.fulfillment_type === 'pickup' && !form.pickup_branch_id;

  if (!items.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography gutterBottom>Your cart is empty</Typography>
        <Button component={Link} to={`${basePath}/shop`} variant="contained">Go to Shop</Button>
      </Box>
    );
  }

  return (
    <Box>
      <StoreBreadcrumbs items={[
        { label: 'Home', to: basePath },
        { label: 'Cart', to: `${basePath}/cart` },
        { label: 'Checkout', to: `${basePath}/checkout` },
      ]} />

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <Button component={Link} to={`${basePath}/cart`} startIcon={<ArrowBack />} color="inherit" size="small">
          Back to cart
        </Button>
      </Stack>

      <Typography variant="h4" fontWeight={800} gutterBottom>Checkout</Typography>

      {checkout.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {checkout.error?.response?.data?.message || 'Checkout failed'}
        </Alert>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} md={7}>
          <Typography variant="h6" fontWeight={700} gutterBottom>Contact Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Full Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Grid>
          </Grid>

          <Typography variant="h6" fontWeight={700} sx={{ mt: 3, mb: 1 }}>Fulfillment</Typography>
          <RadioGroup
            value={form.fulfillment_type}
            onChange={(e) => setForm({ ...form, fulfillment_type: e.target.value, pickup_branch_id: '' })}
          >
            <FormControlLabel value="delivery" control={<Radio />} label="Delivery" />
            <FormControlLabel value="pickup" control={<Radio />} label="Click & collect (pickup)" />
          </RadioGroup>

          {form.fulfillment_type === 'pickup' && (
            <TextField fullWidth select required label="Pickup location" sx={{ mt: 2 }}
              value={form.pickup_branch_id}
              onChange={(e) => setForm({ ...form, pickup_branch_id: e.target.value })}
              helperText={!branches?.length ? 'No pickup locations configured' : 'Select the branch where you will collect your order'}>
              {(branches || []).map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name}{b.city ? ` — ${b.city}` : ''}
                </MenuItem>
              ))}
            </TextField>
          )}

          <Typography variant="h6" fontWeight={700} sx={{ mt: 3, mb: 1 }}>Payment</Typography>
          <TextField fullWidth select label="Payment Method" value={form.payment_method}
            onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
            <MenuItem value="cash">Cash on Delivery / Pay at pickup</MenuItem>
            <MenuItem value="card">Card</MenuItem>
            <MenuItem value="bank">Bank Transfer</MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} md={5}>
          <OrderSummary
            subtotal={subtotal}
            showShippingProgress={false}
            onCheckout={() => checkout.mutate()}
            checkoutLabel={`Place Order — ${formatMoney(total)}`}
            checkoutDisabled={!form.name || pickupInvalid}
            checkoutLoading={checkout.isPending}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
