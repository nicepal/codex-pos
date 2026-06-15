import { Link } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Chip, Button, alpha } from '@mui/material';
import { ShoppingBag, ShoppingCart, Inventory2 } from '@mui/icons-material';
import { resolveImageUrl } from '../../utils/imageUrl';
import useStoreCurrency from '../../hooks/useStoreCurrency';

export default function ProductCard({
  product,
  basePath,
  primaryColor = '#2563eb',
  onAddToCart,
  showAddButton = true,
  showStock = true,
}) {
  const { formatMoney } = useStoreCurrency();
  const outOfStock = product.stock_quantity <= 0;
  const lowStock = !outOfStock && product.stock_quantity <= 10;
  const imageUrl = resolveImageUrl(product.image_url);

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!outOfStock && onAddToCart) onAddToCart(product);
  };

  const stockLabel = outOfStock ? 'Out of stock' : lowStock ? `${product.stock_quantity} left` : 'In stock';
  const stockColor = outOfStock ? 'error' : lowStock ? 'warning' : 'success';

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease',
        '&:hover': { boxShadow: '0 4px 16px rgba(15,23,42,0.08)' },
      }}
    >
      <Box
        component={Link}
        to={`${basePath}/product/${product.slug}`}
        sx={{ textDecoration: 'none', color: 'inherit', flexGrow: 1, display: 'flex', flexDirection: 'column' }}
      >
        <Box sx={{ position: 'relative', pt: '90%', bgcolor: '#f1f5f9', overflow: 'hidden' }}>
          {showStock && (
            <Chip
              icon={<Inventory2 sx={{ fontSize: '14px !important' }} />}
              label={stockLabel}
              size="small"
              color={stockColor}
              sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, fontWeight: 600, height: 24 }}
            />
          )}
          {product.category_name && (
            <Chip
              label={product.category_name}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                zIndex: 1,
                bgcolor: 'background.paper',
                fontWeight: 500,
                fontSize: 11,
                height: 24,
              }}
            />
          )}
          {imageUrl ? (
            <Box
              component="img"
              src={imageUrl}
              alt={product.name}
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag sx={{ fontSize: 40, color: 'text.disabled', opacity: 0.35 }} />
            </Box>
          )}
        </Box>
        <CardContent sx={{ flexGrow: 1, p: 2, pb: showAddButton ? 1 : 2 }}>
          <Typography
            fontWeight={600}
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              fontSize: 14,
              minHeight: 40,
            }}
          >
            {product.name}
          </Typography>
          {product.sku && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              SKU: {product.sku}
            </Typography>
          )}
          <Typography variant="h6" fontWeight={700} color="primary.main" sx={{ mt: 1 }}>
            {formatMoney(product.sale_price)}
          </Typography>
        </CardContent>
      </Box>
      {showAddButton && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Button
            fullWidth
            variant={outOfStock ? 'outlined' : 'contained'}
            size="small"
            startIcon={<ShoppingCart fontSize="small" />}
            disabled={outOfStock}
            onClick={handleAdd}
            sx={outOfStock ? {} : { bgcolor: primaryColor, '&:hover': { bgcolor: alpha(primaryColor, 0.9) } }}
          >
            {outOfStock ? 'Unavailable' : 'Add to cart'}
          </Button>
        </Box>
      )}
    </Card>
  );
}
