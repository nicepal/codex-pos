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

function Section({ title, children, sx }) {
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
      <Typography fontWeight={750} sx={{ fontSize: 15.5, letterSpacing: '-0.02em', mb: 1.75 }}>
        {title}
      </Typography>
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

export default function CheckoutPage() {
  const { formatMoney } = useStoreCurrency();
  const { items } = useSelector((s) => s.storefrontCart);
  const subtotal = useSelector(selectStoreCartTotal);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { basePath, slug, primaryColor, isRestaurant = false } = useOutletContext();
  const [showDiscounts, setShowDiscounts] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    payment_method: 'cash',
    fulfillment_type: 'pickup',
    pickup_branch_id: '',
    delivery_address: '',
    coupon_code: '',
    gift_card_code: '',
    loyalty_points_to_redeem: 0,
  });

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

  // Restaurant shops: honor pickup/delivery preference. Other shops skip fulfillment UI.
  useEffect(() => {
    if (branchesLoading) return;
    if (!isRestaurant) {
      setForm((f) => (f.fulfillment_type === 'delivery' && !f.pickup_branch_id
        ? f
        : { ...f, fulfillment_type: 'delivery', pickup_branch_id: '', delivery_address: '' }));
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

  const checkout = useMutation({
    mutationFn: () => {
      const noteParts = [];
      if (isRestaurant && form.fulfillment_type === 'delivery' && form.delivery_address.trim()) {
        noteParts.push(`Delivery address: ${form.delivery_address.trim()}`);
      }
      return api.post('/storefront/checkout', {
        items: items.map((i) => ({
          product_id: i.product_id,
          variant_id: i.variant_id || undefined,
          product_name: i.name,
          quantity: i.quantity,
        })),
        customer_name: form.name.trim(),
        customer_email: form.email.trim() || undefined,
        customer_phone: form.phone.trim() || undefined,
        payment_method: form.payment_method,
        fulfillment_type: isRestaurant ? form.fulfillment_type : undefined,
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
      dispatch(clearStoreCart());
      navigate(`${basePath}/order/confirm`, { state: { order: res.data.data } });
    },
  });

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: `${SF.radius.sm}px`,
      bgcolor: SF.colors.paper,
    },
  };

  const nameOk = form.name.trim().length >= 1;
  const pickupInvalid = isRestaurant && form.fulfillment_type === 'pickup' && (!hasPickup || !form.pickup_branch_id);
  const deliveryInvalid = isRestaurant && form.fulfillment_type === 'delivery' && !form.delivery_address.trim();
  const canSubmit = nameOk && !pickupInvalid && !deliveryInvalid && !checkout.isPending;

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
          Add items from the menu before checking out.
        </Typography>
        <Button
          component={Link}
          to={basePath}
          variant="contained"
          sx={{ bgcolor: primaryColor, '&:hover': { bgcolor: alpha(primaryColor, 0.9) } }}
        >
          Browse menu
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
        Back to cart
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
          <Section title="Contact">
            <Grid container spacing={1.5}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  sx={fieldSx}
                  autoComplete="name"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  sx={fieldSx}
                  autoComplete="tel"
                  helperText="Recommended so the store can reach you"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  sx={fieldSx}
                  autoComplete="email"
                />
              </Grid>
            </Grid>
          </Section>

          {isRestaurant && (
          <Section title="How would you like your order?">
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
                subtitle="We’ll use the address you provide below"
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
                onChange={(e) => setForm({ ...form, pickup_branch_id: e.target.value })}
              >
                {(branches || []).map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.name}{b.address ? ` — ${b.address}` : ''}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {form.fulfillment_type === 'delivery' && (
              <TextField
                fullWidth
                required
                multiline
                minRows={2}
                label="Delivery address"
                placeholder="Street, area, landmark…"
                value={form.delivery_address}
                onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                sx={{ ...fieldSx, mt: 2 }}
              />
            )}
          </Section>
          )}

          <Section title="Payment">
            <Stack spacing={1.25}>
              {[
                {
                  value: 'cash',
                  title: isRestaurant ? 'Pay at pickup / cash on delivery' : 'Cash on delivery / pay in store',
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
              Have a coupon or gift card?
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
            checkoutLabel={`Place order — ${formatMoney(total)}`}
            checkoutDisabled={!canSubmit}
            checkoutLoading={checkout.isPending}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
