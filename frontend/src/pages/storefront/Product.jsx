import { useState } from 'react';
import { useParams, useOutletContext, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import {
  Box, Typography, Grid, Chip, Button, Stack, Divider, Table, TableBody, TableRow, TableCell,
  Snackbar, Alert, alpha,
} from '@mui/material';
import { ShoppingCart, LocalShipping, Inventory2 } from '@mui/icons-material';
import { addToCart } from '../../features/storefront/cartSlice';
import api from '../../services/api';
import { resolveImageUrl } from '../../utils/imageUrl';
import StoreBreadcrumbs from '../../components/storefront/StoreBreadcrumbs';
import QuantitySelector from '../../components/storefront/QuantitySelector';
import ProductCard from '../../components/storefront/ProductCard';
import ProductReviews from '../../components/storefront/ProductReviews';
import LoadingState from '../../components/LoadingState';
import useStoreCurrency from '../../hooks/useStoreCurrency';

export default function StoreProduct() {
  const { formatMoney } = useStoreCurrency();
  const { productSlug } = useParams();
  const { basePath, primaryColor, showStock } = useOutletContext();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['storefront-product', productSlug],
    queryFn: () => api.get(`/storefront/products/${productSlug}`).then((r) => r.data.data),
  });

  if (isLoading) return <LoadingState message="Loading product…" />;
  if (!product) return <Typography>Product not found</Typography>;

  const images = product.images?.length
    ? product.images
    : (product.image_url ? [{ url: product.image_url }] : []);
  const inStock = product.stock_quantity > 0;
  const lowStock = inStock && product.stock_quantity <= 10;
  const lineTotal = parseFloat(product.sale_price) * qty;

  const addPayload = () => ({
    product_id: product.id,
    name: product.name,
    slug: product.slug,
    sale_price: parseFloat(product.sale_price),
    category_name: product.category_name,
    image_url: images[0]?.url,
    sku: product.sku,
    quantity: qty,
  });

  const handleAddToCart = () => {
    dispatch(addToCart(addPayload()));
    setAdded(true);
  };

  const handleBuyNow = () => {
    dispatch(addToCart(addPayload()));
    navigate(`${basePath}/cart`);
  };

  const handleRelatedAdd = (p) => {
    dispatch(addToCart({
      product_id: p.id,
      name: p.name,
      slug: p.slug,
      sale_price: parseFloat(p.sale_price),
      category_name: p.category_name,
      image_url: p.image_url,
      sku: p.sku,
    }));
  };

  return (
    <Box>
      <StoreBreadcrumbs items={[
        { label: 'Home', to: basePath },
        { label: 'Shop', to: `${basePath}/shop` },
        ...(product.category_name ? [{
          label: product.category_name,
          to: `${basePath}/shop?category=${product.category_slug || ''}`,
        }] : []),
        { label: product.name, to: `${basePath}/product/${product.slug}` },
      ]} />

      <Grid container spacing={4}>
        {/* Images */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: '#f1f5f9',
              border: '1px solid',
              borderColor: 'divider',
              aspectRatio: '1',
            }}
          >
            {images[activeImage]?.url ? (
              <Box
                component="img"
                src={resolveImageUrl(images[activeImage].url)}
                alt={product.name}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.disabled">No image</Typography>
              </Box>
            )}
          </Box>
          {images.length > 1 && (
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              {images.map((img, i) => (
                <Box
                  key={i}
                  onClick={() => setActiveImage(i)}
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 1,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: activeImage === i ? 'primary.main' : 'divider',
                  }}
                >
                  <Box component="img" src={resolveImageUrl(img.url)} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              ))}
            </Stack>
          )}
        </Grid>

        {/* Purchase panel */}
        <Grid item xs={12} md={6}>
          <Stack spacing={2}>
            {product.category_name && (
              <Chip label={product.category_name} size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
            )}
            <Typography variant="h4" fontWeight={800} lineHeight={1.2}>{product.name}</Typography>

            <Stack direction="row" alignItems="baseline" spacing={2}>
              <Typography variant="h4" fontWeight={800} color="primary.main">
                {formatMoney(product.sale_price)}
              </Typography>
              {qty > 1 && (
                <Typography variant="body2" color="text.secondary">
                  {formatMoney(lineTotal)} for {qty} items
                </Typography>
              )}
            </Stack>

            {showStock && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  icon={<Inventory2 sx={{ fontSize: '16px !important' }} />}
                  label={inStock ? (lowStock ? `Only ${product.stock_quantity} left` : `${product.stock_quantity} in stock`) : 'Out of stock'}
                  color={inStock ? (lowStock ? 'warning' : 'success') : 'error'}
                  size="small"
                />
                {inStock && (
                  <Typography variant="caption" color="text.secondary">
                    Synced with store inventory
                  </Typography>
                )}
              </Stack>
            )}

            <Divider />

            <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
              {product.description || 'No description provided for this product.'}
            </Typography>

            {/* Product facts */}
            <Box sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <Table size="small">
                <TableBody>
                  {product.sku && (
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 500, width: '40%' }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{product.sku}</TableCell>
                    </TableRow>
                  )}
                  {product.category_name && (
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 500 }}>Category</TableCell>
                      <TableCell>{product.category_name}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 500 }}>Availability</TableCell>
                    <TableCell>{inStock ? 'Ready to order' : 'Currently unavailable'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 500 }}>Fulfillment</TableCell>
                    <TableCell>Pickup or delivery — confirmed at checkout</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>

            {inStock && (
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: alpha(primaryColor, 0.04),
                  border: '1px solid',
                  borderColor: alpha(primaryColor, 0.15),
                }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Order this item</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>Quantity</Typography>
                    <QuantitySelector value={qty} onChange={setQty} max={product.stock_quantity} />
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flex: 1 }}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<ShoppingCart />}
                      onClick={handleAddToCart}
                      sx={{ flex: 1, py: 1.25 }}
                    >
                      Add to cart
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={handleBuyNow}
                      sx={{ flex: 1, py: 1.25 }}
                    >
                      Buy now
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            )}

            <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
              <LocalShipping fontSize="small" />
              <Typography variant="caption">
                Cash on delivery, card, and bank transfer accepted
              </Typography>
            </Stack>
          </Stack>
        </Grid>
      </Grid>

      <ProductReviews productSlug={product.slug} />

      {product.related?.length > 0 && (
        <Box sx={{ mt: 6, pt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>You may also need</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Other items from our catalog
          </Typography>
          <Grid container spacing={2}>
            {product.related.map((p) => (
              <Grid item xs={6} sm={3} key={p.id}>
                <ProductCard
                  product={p}
                  basePath={basePath}
                  primaryColor={primaryColor}
                  onAddToCart={handleRelatedAdd}
                  showStock={showStock}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Snackbar open={added} autoHideDuration={2500} onClose={() => setAdded(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
          Added to cart —{' '}
          <Box component={Link} to={`${basePath}/cart`} sx={{ color: 'inherit', fontWeight: 700 }}>
            view cart
          </Box>
        </Alert>
      </Snackbar>
    </Box>
  );
}
