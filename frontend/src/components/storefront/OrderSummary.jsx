import { Box, Typography, Button, Divider, Stack, alpha } from '@mui/material';
import { Lock } from '@mui/icons-material';
import { calcOrderTotals } from '../../utils/storefrontPricing';
import { ProductThumb } from './ProductImage';
import ProductNameLink from './ProductNameLink';
import { SF } from './storefrontTheme';
import useStoreCurrency from '../../hooks/useStoreCurrency';

export default function OrderSummary({
  subtotal,
  items = null,
  onCheckout,
  checkoutLabel,
  checkoutDisabled = false,
  checkoutLoading = false,
  primaryColor,
  note,
  basePath,
}) {
  const { formatMoney } = useStoreCurrency();
  const { total } = calcOrderTotals(subtotal);
  const resolvedCheckoutLabel = checkoutLabel || `Place order — ${formatMoney(total)}`;
  const accent = primaryColor || undefined;

  return (
    <Box
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: `${SF.radius.md}px`,
        bgcolor: SF.colors.paper,
        border: '1px solid',
        borderColor: SF.colors.border,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
        position: { md: 'sticky' },
        top: 88,
      }}
    >
      <Typography fontWeight={750} sx={{ fontSize: 16, letterSpacing: '-0.02em', mb: 1.5 }}>
        Order summary
      </Typography>

      {Array.isArray(items) && items.length > 0 && (
        <Stack spacing={1.25} sx={{ mb: 2 }}>
          {items.map((item, idx) => (
            <Stack
              key={`${item.product_id}-${item.variant_id || idx}`}
              direction="row"
              spacing={1.25}
              alignItems="center"
            >
              <ProductThumb src={item.image_url} alt={item.name} size={48} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <ProductNameLink
                  slug={item.slug}
                  name={item.name}
                  basePath={basePath}
                  noWrap
                  fontWeight={600}
                  sx={{ fontSize: 13.5, lineHeight: 1.3, display: 'block' }}
                />
                <Typography variant="caption" color="text.secondary">
                  Qty {item.quantity}
                </Typography>
              </Box>
              <Typography fontWeight={700} sx={{ fontSize: 13.5, flexShrink: 0 }}>
                {formatMoney(item.sale_price * item.quantity)}
              </Typography>
            </Stack>
          ))}
          <Divider sx={{ borderColor: SF.colors.borderSubtle }} />
        </Stack>
      )}

      <Stack spacing={0.85} sx={{ mb: 1.5 }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography color="text.secondary" sx={{ fontSize: 14 }}>Subtotal</Typography>
          <Typography fontWeight={600} sx={{ fontSize: 14 }}>{formatMoney(subtotal)}</Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
          {note || 'Final tax (if any) is calculated when your order is placed.'}
        </Typography>
      </Stack>

      <Divider sx={{ mb: 1.5, borderColor: SF.colors.borderSubtle }} />

      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 2.25 }}>
        <Typography fontWeight={750} sx={{ fontSize: 16 }}>Total</Typography>
        <Typography fontWeight={800} sx={{ fontSize: 20, letterSpacing: '-0.03em' }}>
          {formatMoney(total)}
        </Typography>
      </Stack>

      {onCheckout && (
        <>
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<Lock sx={{ fontSize: '18px !important' }} />}
            onClick={onCheckout}
            disabled={checkoutDisabled || checkoutLoading}
            sx={{
              py: 1.4,
              fontWeight: 750,
              borderRadius: `${SF.radius.sm}px`,
              bgcolor: accent,
              '&:hover': accent ? { bgcolor: alpha(accent, 0.9) } : undefined,
            }}
          >
            {checkoutLoading ? 'Placing order…' : resolvedCheckoutLabel}
          </Button>
          <Typography
            variant="caption"
            color="text.secondary"
            align="center"
            display="block"
            sx={{ mt: 1.25 }}
          >
            By placing this order you agree to the store’s order terms.
          </Typography>
        </>
      )}
    </Box>
  );
}
