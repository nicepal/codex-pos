import {
  Box, Typography, Button, Grid, Stack, Divider, alpha, Chip,
} from '@mui/material';
import { CheckCircleOutline, ArrowForward, LocalShippingOutlined, StoreOutlined } from '@mui/icons-material';
import { Link, useLocation, useOutletContext, Navigate } from 'react-router-dom';
import { ProductThumb } from '../../components/storefront/ProductImage';
import ProductNameLink from '../../components/storefront/ProductNameLink';
import { SF } from '../../components/storefront/storefrontTheme';
import useStoreCurrency from '../../hooks/useStoreCurrency';

const PAYMENT_LABELS = {
  cash: 'Cash on delivery',
  card: 'Card',
  bank: 'Bank transfer',
  other: 'Other',
};

function DetailBlock({ title, children }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          mb: 0.75,
        }}
      >
        {title}
      </Typography>
      <Typography sx={{ fontSize: 14.5, lineHeight: 1.55, whiteSpace: 'pre-line' }}>
        {children}
      </Typography>
    </Box>
  );
}

function formatShipping(shipping, customer) {
  if (!shipping) return null;
  const lines = [
    customer?.name,
    shipping.address1,
    shipping.address2,
    [shipping.city, shipping.postal_code].filter(Boolean).join(' '),
    shipping.country,
  ].filter(Boolean);
  return lines.join('\n') || null;
}

export default function OrderConfirmationPage() {
  const { formatMoney } = useStoreCurrency();
  const { basePath, primaryColor, storeName: ctxStoreName } = useOutletContext();
  const { state } = useLocation();
  const order = state?.order;
  const snapshot = state?.snapshot;

  if (!order) {
    return <Navigate to={basePath || '/'} replace />;
  }

  const customer = snapshot?.customer || {
    name: order.customer_name,
    email: order.customer_email,
    phone: order.customer_phone,
  };
  const shippingText = formatShipping(snapshot?.shipping, customer)
    || order.shipping_address?.formatted
    || null;
  const fulfillment = snapshot?.fulfillment_type || order.fulfillment_type || 'delivery';
  const paymentMethod = snapshot?.payment_method || order.payment_method || 'cash';
  const items = snapshot?.items || order.items || [];
  const subtotal = snapshot?.subtotal ?? order.subtotal ?? order.total_amount;
  const total = order.total_amount;
  const firstName = customer?.first_name || customer?.name?.split(' ')?.[0] || 'there';
  const storeName = snapshot?.storeName || ctxStoreName || 'the store';
  const accent = primaryColor || SF.colors.primary;

  return (
    <Box sx={{ pb: { xs: 4, md: 6 }, pt: { xs: 1, md: 2 } }}>
      <Grid container spacing={{ xs: 2.5, md: 4 }} alignItems="flex-start">
        {/* Left — confirmation & details (Shopify-style) */}
        <Grid item xs={12} md={7}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 2.5 }}>
            <CheckCircleOutline sx={{ fontSize: 40, color: 'success.main', mt: 0.25 }} />
            <Box>
              <Typography color="text.secondary" sx={{ fontSize: 13.5 }}>
                Confirmation #{order.order_number}
              </Typography>
              <Typography
                component="h1"
                fontWeight={750}
                sx={{ fontSize: { xs: 24, md: 28 }, letterSpacing: '-0.03em', lineHeight: 1.2 }}
              >
                Thank you, {firstName}!
              </Typography>
            </Box>
          </Stack>

          <Box
            sx={{
              p: { xs: 2, md: 2.5 },
              mb: 2,
              bgcolor: SF.colors.paper,
              border: '1px solid',
              borderColor: SF.colors.border,
              borderRadius: `${SF.radius.md}px`,
            }}
          >
            <Typography fontWeight={700} sx={{ mb: 0.75, fontSize: 15.5 }}>
              Your order is confirmed
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: 14, lineHeight: 1.5 }}>
              {customer?.email
                ? (
                  <>
                    You&apos;ll receive an email at
                    {' '}
                    <Box component="span" sx={{ fontWeight: 650, color: 'text.primary' }}>{customer.email}</Box>
                    {' '}
                    when your order is ready.
                  </>
                )
                : `${storeName} will process your order shortly.`}
            </Typography>
          </Box>

          <Box
            sx={{
              p: { xs: 2, md: 2.5 },
              mb: 2,
              bgcolor: SF.colors.paper,
              border: '1px solid',
              borderColor: SF.colors.border,
              borderRadius: `${SF.radius.md}px`,
            }}
          >
            <Typography fontWeight={750} sx={{ fontSize: 16, mb: 2, letterSpacing: '-0.02em' }}>
              Order details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DetailBlock title="Contact information">
                  {[customer?.email, customer?.phone].filter(Boolean).join('\n') || '—'}
                </DetailBlock>
                <DetailBlock title={fulfillment === 'pickup' ? 'Pickup method' : 'Shipping method'}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    {fulfillment === 'pickup'
                      ? <StoreOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
                      : <LocalShippingOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />}
                    <span>
                      {fulfillment === 'pickup'
                        ? (snapshot?.pickup_branch?.name
                          ? `Pickup — ${snapshot.pickup_branch.name}`
                          : 'Store pickup')
                        : 'Delivery'}
                    </span>
                  </Stack>
                  {fulfillment === 'pickup' && snapshot?.pickup_branch?.address ? (
                    <Typography component="span" display="block" color="text.secondary" sx={{ fontSize: 13, mt: 0.5 }}>
                      {snapshot.pickup_branch.address}
                    </Typography>
                  ) : null}
                </DetailBlock>
              </Grid>
              <Grid item xs={12} sm={6}>
                {shippingText ? (
                  <DetailBlock title="Ship to">{shippingText}</DetailBlock>
                ) : (
                  <DetailBlock title="Customer">{customer?.name || '—'}</DetailBlock>
                )}
                <DetailBlock title="Payment">
                  {PAYMENT_LABELS[paymentMethod] || paymentMethod}
                </DetailBlock>
              </Grid>
            </Grid>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ sm: 'center' }}
            sx={{ mt: 3 }}
          >
            <Typography color="text.secondary" sx={{ fontSize: 13.5 }}>
              Need help? Contact {storeName}.
            </Typography>
            <Button
              component={Link}
              to={basePath}
              variant="contained"
              endIcon={<ArrowForward />}
              sx={{
                alignSelf: { xs: 'stretch', sm: 'auto' },
                bgcolor: accent,
                fontWeight: 700,
                px: 2.5,
                py: 1.1,
                borderRadius: `${SF.radius.sm}px`,
                '&:hover': { bgcolor: alpha(accent, 0.9) },
              }}
            >
              Continue shopping
            </Button>
          </Stack>
        </Grid>

        {/* Right — order summary */}
        <Grid item xs={12} md={5}>
          <Box
            sx={{
              p: { xs: 2, md: 2.5 },
              bgcolor: { xs: SF.colors.paper, md: alpha(accent, 0.04) },
              border: '1px solid',
              borderColor: SF.colors.border,
              borderRadius: `${SF.radius.md}px`,
              position: { md: 'sticky' },
              top: 88,
            }}
          >
            <Typography fontWeight={750} sx={{ fontSize: 16, mb: 2, letterSpacing: '-0.02em' }}>
              Order summary
            </Typography>

            <Stack spacing={1.5} sx={{ mb: 2 }}>
              {items.length === 0 ? (
                <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                  Order total {formatMoney(total)}
                </Typography>
              ) : items.map((item, idx) => (
                <Stack
                  key={`${item.product_id}-${item.variant_id || idx}`}
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                >
                  <Box sx={{ position: 'relative', flexShrink: 0 }}>
                    <ProductThumb src={item.image_url} alt={item.name} size={56} />
                    <Chip
                      label={item.quantity}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        height: 22,
                        minWidth: 22,
                        fontSize: 11,
                        fontWeight: 700,
                        bgcolor: 'text.secondary',
                        color: '#fff',
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <ProductNameLink
                      slug={item.slug}
                      name={item.name}
                      basePath={basePath}
                      noWrap
                      fontWeight={650}
                      sx={{ fontSize: 14, lineHeight: 1.3, display: 'block' }}
                    />
                  </Box>
                  <Typography fontWeight={700} sx={{ fontSize: 14, flexShrink: 0 }}>
                    {formatMoney((item.sale_price || 0) * (item.quantity || 1))}
                  </Typography>
                </Stack>
              ))}
            </Stack>

            <Divider sx={{ my: 1.75, borderColor: SF.colors.borderSubtle }} />

            <Stack spacing={0.85} sx={{ mb: 1.5 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary" sx={{ fontSize: 14 }}>Subtotal</Typography>
                <Typography fontWeight={600} sx={{ fontSize: 14 }}>{formatMoney(subtotal)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary" sx={{ fontSize: 14 }}>Shipping</Typography>
                <Typography fontWeight={600} sx={{ fontSize: 14 }}>
                  {fulfillment === 'pickup' ? 'Pickup' : 'Calculated by store'}
                </Typography>
              </Stack>
            </Stack>

            <Divider sx={{ mb: 1.5, borderColor: SF.colors.borderSubtle }} />

            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
              <Typography fontWeight={750} sx={{ fontSize: 16 }}>Total</Typography>
              <Typography fontWeight={800} sx={{ fontSize: 22, letterSpacing: '-0.03em', color: accent }}>
                {formatMoney(total)}
              </Typography>
            </Stack>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
