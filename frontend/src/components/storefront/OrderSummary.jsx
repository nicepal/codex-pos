import { Box, Typography, Button, Divider, LinearProgress, alpha } from '@mui/material';
import { Lock } from '@mui/icons-material';
import { calcOrderTotals, FREE_SHIPPING_THRESHOLD } from '../../utils/storefrontPricing';
import { STOREFRONT_COLORS } from './storefrontTheme';
import useStoreCurrency from '../../hooks/useStoreCurrency';

export default function OrderSummary({
  subtotal,
  onCheckout,
  checkoutLabel,
  checkoutDisabled = false,
  checkoutLoading = false,
  showShippingProgress = true,
}) {
  const { formatMoney } = useStoreCurrency();
  const { shipping, tax, total, freeShippingRemaining } = calcOrderTotals(subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const resolvedCheckoutLabel = checkoutLabel || `Checkout — ${formatMoney(total)}`;

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: STOREFRONT_COLORS.paper,
        border: '1px solid',
        borderColor: 'divider',
        position: { md: 'sticky' },
        top: 88,
      }}
    >
      <Typography variant="h6" fontWeight={700} gutterBottom>Order Summary</Typography>

      {showShippingProgress && subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD && (
        <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: alpha('#2563eb', 0.08), border: '1px solid', borderColor: alpha('#2563eb', 0.2) }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            You&apos;re <strong>{formatMoney(freeShippingRemaining)}</strong> away from free shipping!
          </Typography>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {formatMoney(subtotal)} / {formatMoney(FREE_SHIPPING_THRESHOLD)}
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography color="text.secondary">Subtotal</Typography>
        <Typography fontWeight={500}>{formatMoney(subtotal)}</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography color="text.secondary">Shipping</Typography>
        <Typography fontWeight={500}>{shipping === 0 ? 'Free' : formatMoney(shipping)}</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography color="text.secondary">Tax</Typography>
        <Typography fontWeight={500}>{formatMoney(tax)}</Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6" fontWeight={700}>Total</Typography>
        <Typography variant="h6" fontWeight={700}>{formatMoney(total)}</Typography>
      </Box>

      {onCheckout && (
        <>
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<Lock />}
            onClick={onCheckout}
            disabled={checkoutDisabled || checkoutLoading}
            sx={{ py: 1.5, fontWeight: 700 }}
          >
            {checkoutLoading ? 'Processing…' : resolvedCheckoutLabel}
          </Button>
          <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1.5 }}>
            <Lock sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
            Secure checkout
          </Typography>
        </>
      )}
    </Box>
  );
}
