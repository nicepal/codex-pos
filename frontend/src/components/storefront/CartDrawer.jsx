import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box, Drawer, Typography, IconButton, Button, Stack, Divider, alpha,
} from '@mui/material';
import { Close, DeleteOutline, ShoppingBagOutlined } from '@mui/icons-material';
import {
  removeFromCart, updateCartQty, selectStoreCartTotal,
} from '../../features/storefront/cartSlice';
import QuantitySelector from './QuantitySelector';
import { ProductThumb } from './ProductImage';
import ProductNameLink from './ProductNameLink';
import useStoreCurrency from '../../hooks/useStoreCurrency';
import { SF } from './storefrontTheme';

export default function CartDrawer({ open, onClose, basePath, primaryColor }) {
  const { formatMoney } = useStoreCurrency();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector((s) => s.storefrontCart.items);
  const subtotal = useSelector(selectStoreCartTotal);
  const itemCount = items.reduce((n, i) => n + i.quantity, 0);

  const goCheckout = () => {
    onClose();
    navigate(`${basePath}/checkout`);
  };

  const goCart = () => {
    onClose();
    navigate(`${basePath}/cart`);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 400 },
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.75 }}>
        <Box>
          <Typography fontWeight={750} sx={{ fontSize: 17, letterSpacing: '-0.02em' }}>
            Your cart
          </Typography>
          {itemCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              {itemCount} item{itemCount === 1 ? '' : 's'}
            </Typography>
          )}
        </Box>
        <IconButton aria-label="Close cart" onClick={onClose} size="small" sx={{ width: 36, height: 36 }}>
          <Close />
        </IconButton>
      </Stack>
      <Divider />

      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
        {items.length === 0 ? (
          <Box sx={{ py: 7, px: 2, textAlign: 'center' }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: SF.colors.paperMuted,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5,
              }}
            >
              <ShoppingBagOutlined sx={{ color: 'text.disabled' }} />
            </Box>
            <Typography fontWeight={700} sx={{ mb: 0.5 }}>Cart is empty</Typography>
            <Typography color="text.secondary" sx={{ mb: 2.5, fontSize: 14 }}>
              Add items from the menu to get started.
            </Typography>
            <Button
              variant="contained"
              onClick={onClose}
              sx={{
                fontWeight: 700,
                bgcolor: primaryColor,
                '&:hover': { bgcolor: alpha(primaryColor, 0.9) },
              }}
            >
              Browse menu
            </Button>
          </Box>
        ) : (
          <Stack spacing={2}>
            {items.map((item, idx) => {
              const lineTotal = Number(item.sale_price) * Number(item.quantity);
              return (
                <Stack
                  key={`${item.product_id}-${item.variant_id || idx}`}
                  direction="row"
                  spacing={1.5}
                  alignItems="flex-start"
                >
                  <ProductThumb src={item.image_url} alt={item.name} size={68} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <ProductNameLink
                          slug={item.slug}
                          name={item.name}
                          basePath={basePath}
                          fontWeight={650}
                          sx={{ fontSize: 14, lineHeight: 1.3, display: 'block' }}
                          onClick={onClose}
                        />
                        {(item.variant_name || item.category_name) && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.15 }}>
                            {item.variant_name || item.category_name}
                          </Typography>
                        )}
                      </Box>
                      <Typography fontWeight={750} sx={{ fontSize: 14, flexShrink: 0 }}>
                        {formatMoney(lineTotal)}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>
                      {formatMoney(item.sale_price)} each
                    </Typography>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                      <QuantitySelector
                        value={item.quantity}
                        size="small"
                        primaryColor={primaryColor}
                        onChange={(q) => dispatch(updateCartQty({ index: idx, quantity: q }))}
                        allowZero
                      />
                      <IconButton
                        size="small"
                        aria-label="Remove item"
                        onClick={() => dispatch(removeFromCart(idx))}
                        sx={{ color: 'text.disabled', width: 36, height: 36 }}
                      >
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                </Stack>
              );
            })}
          </Stack>
        )}
      </Box>

      {items.length > 0 && (
        <Box
          sx={{
            px: 2,
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: SF.colors.paper,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
            <Typography fontWeight={650}>Subtotal</Typography>
            <Typography fontWeight={800} sx={{ fontSize: 18, letterSpacing: '-0.02em' }}>
              {formatMoney(subtotal)}
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.75 }}>
            Taxes & fees calculated at checkout
          </Typography>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={goCheckout}
            sx={{
              py: 1.4,
              fontWeight: 750,
              fontSize: 15,
              bgcolor: primaryColor,
              '&:hover': { bgcolor: alpha(primaryColor, 0.9) },
            }}
          >
            Checkout — {formatMoney(subtotal)}
          </Button>
          <Button fullWidth size="small" onClick={goCart} sx={{ mt: 1, color: 'text.secondary', fontWeight: 550 }}>
            View full cart
          </Button>
        </Box>
      )}
    </Drawer>
  );
}
