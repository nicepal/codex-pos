import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Box, Typography, TextField, Grid, Alert, MenuItem, Stack, Button } from '@mui/material';
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
  const [form, setForm] = useState({ name: '', email: '', phone: '', payment_method: 'cash' });
  const { total } = calcOrderTotals(subtotal);

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
    }),
    onSuccess: (res) => {
      dispatch(clearStoreCart());
      navigate(`${basePath}/order/confirm`, { state: { order: res.data.data } });
    },
  });

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
          {checkout.error?.response?.data?.details?.length > 0 && (
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
              {checkout.error.response.data.details.map((d) => (
                <li key={d.field}><Typography variant="body2">{d.field}: {d.message}</Typography></li>
              ))}
            </Box>
          )}
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
            <Grid item xs={12}>
              <TextField fullWidth select label="Payment Method" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                <MenuItem value="cash">Cash on Delivery</MenuItem>
                <MenuItem value="card">Card</MenuItem>
                <MenuItem value="bank">Bank Transfer</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={5}>
          <OrderSummary
            subtotal={subtotal}
            showShippingProgress={false}
            onCheckout={() => checkout.mutate()}
            checkoutLabel={`Place Order — ${formatMoney(total)}`}
            checkoutDisabled={!form.name}
            checkoutLoading={checkout.isPending}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
