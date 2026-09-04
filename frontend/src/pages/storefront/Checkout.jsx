import { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Box, Typography, TextField, Grid, Alert, MenuItem, Stack, Button, Collapse,
  alpha,
} from '@mui/material';
import {
  ArrowBack, LocalShippingOutlined, StoreOutlined, ExpandMore, ExpandLess,
} from '@mui/icons-material';
import api from '../../services/api';
import { selectStoreCartTotal, clearStoreCart } from '../../features/storefront/cartSlice';
import OrderSummary from '../../components/storefront/OrderSummary';
import { calcOrderTotals } from '../../utils/storefrontPricing';
import useStoreCurrency from '../../hooks/useStoreCurrency';
import { SF } from '../../components/storefront/storefrontTheme';

function Section({ title, subtitle, children, sx }) {
  return (
    <Box
      sx={{
        p: { xs: 2, md: 2.5 },
        mb: 2,
        bgcolor: SF.colors.paper,
        border: '1px solid',
        borderColor: SF.colors.border,
        borderRadius: `${SF.radius.md}px`,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
        ...sx,
      }}
    >
      <Typography fontWeight={750} sx={{ fontSize: 15.5, letterSpacing: '-0.02em', mb: subtitle ? 0.35 : 1.75 }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography color="text.secondary" sx={{ fontSize: 13, mb: 1.75, lineHeight: 1.4 }}>
          {subtitle}
        </Typography>
      ) : null}
      {children}
    </Box>
  );
}

function ChoiceCard({ selected, onClick, icon, title, subtitle, primaryColor, disabled }) {
  return (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.25,
        textAlign: 'left',
        width: '100%',
        p: 1.5,
        borderRadius: `${SF.radius.sm}px`,
        border: '1.5px solid',
        borderColor: selected ? primaryColor : SF.colors.border,
        bgcolor: selected ? alpha(primaryColor, 0.06) : SF.colors.paper,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
        '&:hover': disabled ? undefined : {
          borderColor: selected ? primaryColor : alpha(primaryColor, 0.45),
        },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: `${SF.radius.sm}px`,
          bgcolor: selected ? alpha(primaryColor, 0.12) : SF.colors.paperMuted,
          color: selected ? primaryColor : 'text.secondary',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography fontWeight={700} sx={{ fontSize: 14, lineHeight: 1.3 }}>{title}</Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ fontSize: 12.5, mt: 0.25, lineHeight: 1.35 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

const emptyForm = {
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  address1: '',
  address2: '',
  city: '',
  postal_code: '',
  country: '',
  payment_method: 'cash',
  fulfillment_type: 'delivery',
  pickup_branch_id: '',
  coupon_code: '',
  gift_card_code: '',
  loyalty_points_to_redeem: 0,
};

export default function CheckoutPage() {
  const { formatMoney } = useStoreCurrency();
  const { items } = useSelector((s) => s.storefrontCart);
  const subtotal = useSelector(selectStoreCartTotal);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { basePath, slug, primaryColor, isRestaurant = false, storeName } = useOutletContext();
  const [showDiscounts, setShowDiscounts] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const { data: loyaltyInfo } = useQuery({
    queryKey: ['storefront-loyalty', slug, form.email],
    queryFn: () => api.get('/storefront/loyalty-preview', { params: { email: form.email.trim() } }).then((r) => r.data.data),
    enabled: Boolean(form.email?.includes('@')),
  });

  const loyaltyPoints = loyaltyInfo?.points || 0;
  const redeemRate = loyaltyInfo?.redeem_rate || 0.01;
  const { total } = calcOrderTotals(subtotal);
  const maxRedeemPoints = Math.min(loyaltyPoints, Math.ceil(total / redeemRate) || 0);
  const loyaltyDiscount = (form.loyalty_points_to_redeem || 0) * redeemRate;

  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['storefront-branches', slug],
    queryFn: () => api.get('/storefront/branches').then((r) => r.data.data),
  });

  const hasPickup = isRestaurant && Array.isArray(branches) && branches.length > 0;
  const needsShippingAddress = !isRestaurant || form.fulfillment_type === 'delivery';

  useEffect(() => {
    if (branchesLoading) return;
    if (!isRestaurant) {
      setForm((f) => ({ ...f, fulfillment_type: 'delivery', pickup_branch_id: '' }));
      return;
    }
    const storageKey = `storefront-fulfillment-${slug}`;
    let preferred = null;
    try {
      preferred = localStorage.getItem(storageKey);
    } catch { /* ignore */ }

    if (hasPickup) {
      setForm((f) => {
        const nextType = preferred === 'delivery' ? 'delivery' : 'pickup';
        const branchId = f.pickup_branch_id || (branches.length === 1 ? branches[0].id : '');
        return {
          ...f,
          fulfillment_type: nextType,
          pickup_branch_id: nextType === 'pickup' ? branchId : '',
        };
      });
    } else {
      setForm((f) => (f.fulfillment_type === 'delivery' ? f : { ...f, fulfillment_type: 'delivery', pickup_branch_id: '' }));
    }
  }, [branchesLoading, hasPickup, branches, slug, isRestaurant]);

  const fullName = `${form.first_name} ${form.last_name}`.trim();

  const checkout = useMutation({
    mutationFn: () => {
      const noteParts = [];
      if (isRestaurant && form.fulfillment_type === 'pickup' && form.pickup_branch_id) {
        const branch = (branches || []).find((b) => b.id === form.pickup_branch_id);
        if (branch) noteParts.push(`Pickup: ${branch.name}${branch.address ? ` — ${branch.address}` : ''}`);
      }
      return api.post('/storefront/checkout', {
        items: items.map((i) => ({
          product_id: i.product_id,
          variant_id: i.variant_id || undefined,
          product_name: i.name,
          quantity: i.quantity,
        })),
        customer_name: fullName,
        customer_email: form.email.trim(),
        customer_phone: form.phone.trim() || undefined,
        shipping_address: needsShippingAddress ? {
          line1: form.address1.trim() || undefined,
          line2: form.address2.trim() || undefined,
          city: form.city.trim() || undefined,
          postal_code: form.postal_code.trim() || undefined,
          country: form.country.trim() || undefined,
        } : undefined,
        payment_method: form.payment_method,
        fulfillment_type: isRestaurant ? form.fulfillment_type : 'delivery',
        pickup_branch_id: isRestaurant && form.fulfillment_type === 'pickup'
          ? (form.pickup_branch_id || undefined)
          : undefined,
        coupon_code: form.coupon_code.trim() || undefined,
        gift_card_code: form.gift_card_code.trim() || undefined,
        loyalty_points_to_redeem: form.loyalty_points_to_redeem > 0 ? form.loyalty_points_to_redeem : undefined,
        notes: noteParts.length ? noteParts.join('\n') : undefined,
      });
    },
    onSuccess: (res) => {
      const order = res.data.data;
      const branch = (branches || []).find((b) => b.id === form.pickup_branch_id);
      navigate(`${basePath}/order/confirm`, {
        state: {
          order,
          snapshot: {
            storeName,
            items: items.map((i) => ({
              product_id: i.product_id,
              variant_id: i.variant_id,
              name: i.name,
              quantity: i.quantity,
              sale_price: i.sale_price,
              image_url: i.image_url,
            })),
            subtotal,
            customer: {
              email: form.email.trim(),
              name: fullName,
              phone: form.phone.trim(),
              first_name: form.first_name.trim(),
              last_name: form.last_name.trim(),
            },
            shipping: needsShippingAddress ? {
              address1: form.address1.trim(),
              address2: form.address2.trim(),
              city: form.city.trim(),
              postal_code: form.postal_code.trim(),
              country: form.country.trim(),
            } : null,
            fulfillment_type: isRestaurant ? form.fulfillment_type : 'delivery',
            pickup_branch: branch ? { name: branch.name, address: branch.address } : null,
            payment_method: form.payment_method,
          },
        },
      });
      dispatch(clearStoreCart());
    },
  });

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: `${SF.radius.sm}px`,
      bgcolor: SF.colors.paper,
    },
  };

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const nameOk = form.first_name.trim().length >= 1 && form.last_name.trim().length >= 1;
  const addressOk = !needsShippingAddress
    || (form.address1.trim() && form.city.trim() && form.country.trim());
  const pickupInvalid = isRestaurant && form.fulfillment_type === 'pickup' && (!hasPickup || !form.pickup_branch_id);
  const canSubmit = emailOk && nameOk && addressOk && !pickupInvalid && !checkout.isPending;

  const errorMessage = useMemo(() => {
    const apiMsg = checkout.error?.response?.data?.message;
    if (apiMsg) return apiMsg;
    if (checkout.isError) return 'Unable to place your order. Please try again.';
    return null;
  }, [checkout.error, checkout.isError]);

  if (!items.length) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          px: 2,
          maxWidth: 420,
          mx: 'auto',
          bgcolor: SF.colors.paper,
          borderRadius: `${SF.radius.md}px`,
          border: '1px dashed',
          borderColor: SF.colors.border,
        }}
      >
        <Typography fontWeight={750} gutterBottom sx={{ letterSpacing: '-0.02em' }}>
          Your cart is empty
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2.5, fontSize: 14 }}>
          Add items before checking out.
        </Typography>
        <Button
          component={Link}
          to={basePath}
          variant="contained"
          sx={{ bgcolor: primaryColor, '&:hover': { bgcolor: alpha(primaryColor, 0.9) } }}
        >
          Continue shopping
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 2 }}>
      <Button
        component={Link}
        to={`${basePath}/cart`}
        startIcon={<ArrowBack />}
        color="inherit"
        size="small"
        sx={{
          mb: 1.5,
          color: 'text.secondary',
          fontWeight: 600,
          px: 0.5,
          '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
        }}
      >
        Cart
      </Button>

      <Typography
        component="h1"
        fontWeight={750}
        sx={{ fontSize: { xs: 22, md: 26 }, letterSpacing: '-0.03em', mb: 2.25 }}
      >
        Checkout
      </Typography>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: `${SF.radius.sm}px` }}>
          {errorMessage}
        </Alert>
      )}

      <Grid container spacing={{ xs: 2, md: 3 }}>
        <Grid item xs={12} md={7}>
          <Section title="Contact" subtitle="Order updates will be sent here">
            <Grid container spacing={1.5}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={setField('email')}
                  sx={fieldSx}
                  autoComplete="email"
                  error={Boolean(form.email) && !emailOk}
                  helperText={form.email && !emailOk ? 'Enter a valid email' : ' '}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone (optional)"
                  value={form.phone}
                  onChange={setField('phone')}
                  sx={fieldSx}
                  autoComplete="tel"
                />
              </Grid>
            </Grid>
          </Section>

          {isRestaurant && (
            <Section title="Delivery method">
              <Stack spacing={1.25}>
                <ChoiceCard
                  selected={form.fulfillment_type === 'pickup'}
                  disabled={!hasPickup}
                  primaryColor={primaryColor}
                  onClick={() => setForm({
                    ...form,
                    fulfillment_type: 'pickup',
                    pickup_branch_id: form.pickup_branch_id || (branches?.[0]?.id || ''),
                  })}
                  icon={<StoreOutlined fontSize="small" />}
                  title="Pickup"
                  subtitle={hasPickup ? 'Collect from the store' : 'No pickup locations available'}
                />
                <ChoiceCard
                  selected={form.fulfillment_type === 'delivery'}
                  primaryColor={primaryColor}
                  onClick={() => setForm({ ...form, fulfillment_type: 'delivery', pickup_branch_id: '' })}
                  icon={<LocalShippingOutlined fontSize="small" />}
                  title="Delivery"
                  subtitle="Ship to your address"
                />
              </Stack>

              {form.fulfillment_type === 'pickup' && hasPickup && (
                <TextField
                  fullWidth
                  select
                  required
                  label="Pickup location"
                  sx={{ ...fieldSx, mt: 2 }}
                  value={form.pickup_branch_id}
                  onChange={setField('pickup_branch_id')}
                >
                  {(branches || []).map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.name}{b.address ? ` — ${b.address}` : ''}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Section>
          )}

          {needsShippingAddress && (
            <Section
              title={isRestaurant ? 'Delivery address' : 'Shipping address'}
              subtitle="Where should we send this order?"
            >
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="First name"
                    value={form.first_name}
                    onChange={setField('first_name')}
                    sx={fieldSx}
                    autoComplete="given-name"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Last name"
                    value={form.last_name}
                    onChange={setField('last_name')}
                    sx={fieldSx}
                    autoComplete="family-name"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Address"
                    value={form.address1}
                    onChange={setField('address1')}
                    sx={fieldSx}
                    autoComplete="address-line1"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Apartment, suite, etc. (optional)"
                    value={form.address2}
                    onChange={setField('address2')}
                    sx={fieldSx}
                    autoComplete="address-line2"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    required
                    label="City"
                    value={form.city}
                    onChange={setField('city')}
                    sx={fieldSx}
                    autoComplete="address-level2"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Postal code"
                    value={form.postal_code}
                    onChange={setField('postal_code')}
                    sx={fieldSx}
                    autoComplete="postal-code"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    required
                    label="Country / region"
                    value={form.country}
                    onChange={setField('country')}
                    sx={fieldSx}
                    autoComplete="country-name"
                  />
                </Grid>
              </Grid>
            </Section>
          )}

          {!needsShippingAddress && (
            <Section title="Your name">
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="First name"
                    value={form.first_name}
                    onChange={setField('first_name')}
                    sx={fieldSx}
                    autoComplete="given-name"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Last name"
                    value={form.last_name}
                    onChange={setField('last_name')}
                    sx={fieldSx}
                    autoComplete="family-name"
                  />
                </Grid>
              </Grid>
            </Section>
          )}

          <Section title="Payment">
            <Stack spacing={1.25}>
              {[
                {
                  value: 'cash',
                  title: isRestaurant ? 'Pay at pickup / cash on delivery' : 'Cash on delivery',
                  subtitle: 'Pay when you receive your order',
                },
                { value: 'card', title: 'Card', subtitle: 'Pay by card with the store' },
                { value: 'bank', title: 'Bank transfer', subtitle: 'Transfer and share proof if requested' },
              ].map((opt) => (
                <ChoiceCard
                  key={opt.value}
                  selected={form.payment_method === opt.value}
                  primaryColor={primaryColor}
                  onClick={() => setForm({ ...form, payment_method: opt.value })}
                  icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: form.payment_method === opt.value ? primaryColor : SF.colors.border }} />}
                  title={opt.title}
                  subtitle={opt.subtitle}
                />
              ))}
            </Stack>
          </Section>

          <Box sx={{ mb: 2 }}>
            <Button
              fullWidth
              onClick={() => setShowDiscounts((v) => !v)}
              endIcon={showDiscounts ? <ExpandLess /> : <ExpandMore />}
              sx={{
                justifyContent: 'space-between',
                color: 'text.secondary',
                fontWeight: 650,
                bgcolor: SF.colors.paper,
                border: '1px solid',
                borderColor: SF.colors.border,
                borderRadius: `${SF.radius.md}px`,
                px: 2,
                py: 1.25,
              }}
            >
              Have a discount code?
            </Button>
            <Collapse in={showDiscounts}>
              <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Coupon code"
                    value={form.coupon_code}
                    onChange={(e) => setForm({ ...form, coupon_code: e.target.value.toUpperCase() })}
                    sx={fieldSx}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Gift card code"
                    value={form.gift_card_code}
                    onChange={(e) => setForm({ ...form, gift_card_code: e.target.value.toUpperCase() })}
                    sx={fieldSx}
                  />
                </Grid>
                {loyaltyPoints > 0 && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label={`Loyalty points (balance ${loyaltyPoints})`}
                      value={form.loyalty_points_to_redeem || ''}
                      onChange={(e) => {
                        const n = Math.max(0, Math.min(maxRedeemPoints, parseInt(e.target.value, 10) || 0));
                        setForm({ ...form, loyalty_points_to_redeem: n });
                      }}
                      inputProps={{ min: 0, max: maxRedeemPoints }}
                      helperText={form.loyalty_points_to_redeem > 0
                        ? `−${formatMoney(loyaltyDiscount)} off this order`
                        : `Up to ${maxRedeemPoints} points`}
                      sx={fieldSx}
                    />
                  </Grid>
                )}
              </Grid>
            </Collapse>
          </Box>
        </Grid>

        <Grid item xs={12} md={5}>
          <OrderSummary
            subtotal={subtotal}
            items={items}
            primaryColor={primaryColor}
            onCheckout={() => checkout.mutate()}
            checkoutLabel={`Pay now — ${formatMoney(total)}`}
            checkoutDisabled={!canSubmit}
            checkoutLoading={checkout.isPending}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
