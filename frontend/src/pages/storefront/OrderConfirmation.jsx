import { Box, Typography, Button, alpha } from '@mui/material';
import { CheckCircle, ArrowForward } from '@mui/icons-material';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { STOREFRONT_COLORS } from '../../components/storefront/storefrontTheme';
import useStoreCurrency from '../../hooks/useStoreCurrency';

export default function OrderConfirmationPage() {
  const { formatMoney } = useStoreCurrency();
  const { basePath } = useOutletContext();
  const { state } = useLocation();
  const order = state?.order;

  return (
    <Box
      sx={{
        maxWidth: 520,
        mx: 'auto',
        textAlign: 'center',
        py: 6,
        px: 3,
        borderRadius: 3,
        bgcolor: STOREFRONT_COLORS.paper,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <CheckCircle sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
      <Typography variant="h4" fontWeight={800} gutterBottom>Order Confirmed!</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Thank you for your purchase. We&apos;ll process your order shortly.
      </Typography>
      {order && (
        <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#fff', 0.04), mb: 3 }}>
          <Typography variant="body2" color="text.secondary">Order number</Typography>
          <Typography fontWeight={700} sx={{ mb: 1 }}>{order.order_number}</Typography>
          <Typography variant="h5" color="primary.main" fontWeight={800}>
            {formatMoney(order.total_amount)}
          </Typography>
        </Box>
      )}
      <Button component={Link} to={basePath} variant="contained" size="large" endIcon={<ArrowForward />}>
        Continue Shopping
      </Button>
    </Box>
  );
}
