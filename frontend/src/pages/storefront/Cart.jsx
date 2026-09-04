import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Box, Typography, Grid, Button, IconButton, Stack,
} from '@mui/material';
import { DeleteOutline, ArrowBack, ShoppingBagOutlined } from '@mui/icons-material';
import { removeFromCart, updateCartQty, selectStoreCartTotal } from '../../features/storefront/cartSlice';
import OrderSummary from '../../components/storefront/OrderSummary';
import QuantitySelector from '../../components/storefront/QuantitySelector';
import { ProductThumb } from '../../components/storefront/ProductImage';
import ProductNameLink from '../../components/storefront/ProductNameLink';
import useStoreCurrency from '../../hooks/useStoreCurrency';
import { SF } from '../../components/storefront/storefrontTheme';

export default function StoreCart() {
  const { formatMoney } = useStoreCurrency();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { basePath, primaryColor } = useOutletContext();
  const { items } = useSelector((s) => s.storefrontCart);
  const subtotal = useSelector(selectStoreCartTotal);

  if (!items.length) {
    return (
      <Box sx={{ py: 6, textAlign: 'center', maxWidth: 420, mx: 'auto' }}>
        <ShoppingBagOutlined sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
        <Typography fontWeight={750} sx={{ fontSize: 20, mb: 1 }}>Your cart is empty</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Browse the menu and add items to get started.
        </Typography>
        <Button component={Link} to={basePath} variant="contained" sx={{ bgcolor: primaryColor }}>
          Back to menu
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
        <Typography component="h1" fontWeight={750} sx={{ fontSize: { xs: 20, md: 24 } }}>
          Your cart
        </Typography>
        <Button component={Link} to={basePath} startIcon={<ArrowBack />} color="inherit" size="small">
          Continue ordering
        </Button>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Stack
            spacing={0}
            sx={{
              borderRadius: SF.radius.md,
              bgcolor: 'background.paper',
              overflow: 'hidden',
            }}
          >
            {items.map((item, idx) => (
              <Stack
                key={`${item.product_id}-${item.variant_id || idx}`}
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{
                  px: 2,
                  py: 1.75,
                  borderBottom: idx < items.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}
              >
                <ProductThumb src={item.image_url} alt={item.name} size={64} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <ProductNameLink
                    slug={item.slug}
                    name={item.name}
                    basePath={basePath}
                    fontWeight={600}
                    noWrap
                    sx={{ fontSize: 14, display: 'block' }}
                  />
                  {(item.variant_name || item.category_name) && (
                    <Typography variant="caption" color="text.secondary">
                      {item.variant_name || item.category_name}
                    </Typography>
                  )}
                  <Typography fontWeight={700} color="primary.main" sx={{ fontSize: 14, mt: 0.25 }}>
                    {formatMoney(item.sale_price)}
                  </Typography>
                </Box>
                <QuantitySelector
                  value={item.quantity}
                  size="small"
                  allowZero
                  onChange={(q) => dispatch(updateCartQty({ index: idx, quantity: q }))}
                />
                <Typography fontWeight={700} sx={{ minWidth: 64, textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                  {formatMoney(item.sale_price * item.quantity)}
                </Typography>
                <IconButton size="small" onClick={() => dispatch(removeFromCart(idx))} aria-label="Remove">
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        </Grid>

        <Grid item xs={12} md={4}>
          <OrderSummary
            subtotal={subtotal}
            items={items}
            primaryColor={primaryColor}
            basePath={basePath}
            onCheckout={() => navigate(`${basePath}/checkout`)}
            checkoutLabel="Continue to checkout"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
