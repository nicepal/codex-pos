import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Box, Typography, Grid, Button, IconButton, Stack,
} from '@mui/material';
import { Delete, ArrowBack, ShoppingBag } from '@mui/icons-material';
import { removeFromCart, updateCartQty, selectStoreCartTotal } from '../../features/storefront/cartSlice';
import { resolveImageUrl } from '../../utils/imageUrl';
import OrderSummary from '../../components/storefront/OrderSummary';
import QuantitySelector from '../../components/storefront/QuantitySelector';
import StoreBreadcrumbs from '../../components/storefront/StoreBreadcrumbs';
import EmptyState from '../../components/EmptyState';
import { STOREFRONT_COLORS } from '../../components/storefront/storefrontTheme';
import useStoreCurrency from '../../hooks/useStoreCurrency';

const EMPTY_CART_BENEFITS = [
  { icon: 'inventory', title: 'Live inventory', description: 'Only order items that are in stock at our store right now.' },
  { icon: 'tag', title: 'Synced pricing', description: 'Cart prices match what you pay in-store at checkout.' },
  { icon: 'chart', title: 'Fast checkout', description: 'Place your order online for pickup or delivery.' },
];

export default function StoreCart() {
  const { formatMoney } = useStoreCurrency();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { basePath } = useOutletContext();
  const { items } = useSelector((s) => s.storefrontCart);
  const subtotal = useSelector(selectStoreCartTotal);

  if (!items.length) {
    return (
      <Box>
        <StoreBreadcrumbs items={[
          { label: 'Home', to: basePath },
          { label: 'Cart', to: `${basePath}/cart` },
        ]} />
        <EmptyState
          illustration="cart"
          title="Your cart is empty"
          message="You haven't added any items yet. Browse our catalog — stock and prices stay synced with our POS."
          actionLabel="Browse catalog"
          actionIcon={<ShoppingBag />}
          onAction={() => navigate(`${basePath}/shop`)}
          benefits={EMPTY_CART_BENEFITS}
        />
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button component={Link} to={basePath} color="inherit" sx={{ color: 'text.secondary' }}>
            Back to store home
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Your Shopping Cart</Typography>
        <Button component={Link} to={`${basePath}/shop`} startIcon={<ArrowBack />} color="inherit">
          Continue Shopping
        </Button>
      </Stack>

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Box sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Box
              sx={{
                display: { xs: 'none', sm: 'grid' },
                gridTemplateColumns: '2fr 1fr 1fr 1fr 40px',
                gap: 2,
                px: 3,
                py: 1.5,
                bgcolor: STOREFRONT_COLORS.paperMuted,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" fontWeight={700} color="text.secondary">PRODUCT</Typography>
              <Typography variant="caption" fontWeight={700} color="text.secondary">PRICE</Typography>
              <Typography variant="caption" fontWeight={700} color="text.secondary">QUANTITY</Typography>
              <Typography variant="caption" fontWeight={700} color="text.secondary" align="right">TOTAL</Typography>
              <span />
            </Box>

            {items.map((item, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr 40px' },
                  gap: 2,
                  alignItems: 'center',
                  px: 3,
                  py: 2.5,
                  borderBottom: idx < items.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 1.5,
                      overflow: 'hidden',
                      bgcolor: '#f1f5f9',
                      flexShrink: 0,
                    }}
                  >
                    {item.image_url ? (
                      <Box component="img" src={resolveImageUrl(item.image_url)} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : null}
                  </Box>
                  <Box>
                    <Typography fontWeight={600}>{item.name}</Typography>
                    {item.category_name && (
                      <Typography variant="caption" color="text.secondary">{item.category_name}</Typography>
                    )}
                  </Box>
                </Stack>
                <Typography sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {formatMoney(item.sale_price)}
                </Typography>
                <QuantitySelector
                  value={item.quantity}
                  onChange={(q) => dispatch(updateCartQty({ index: idx, quantity: q }))}
                />
                <Typography fontWeight={600} align="right">
                  {formatMoney(item.sale_price * item.quantity)}
                </Typography>
                <IconButton size="small" onClick={() => dispatch(removeFromCart(idx))} sx={{ color: 'text.secondary' }}>
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <OrderSummary
            subtotal={subtotal}
            onCheckout={() => navigate(`${basePath}/checkout`)}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
