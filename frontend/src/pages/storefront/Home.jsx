import { Link, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import {
  Box, Typography, Grid, Button, Container, Stack, Chip, alpha,
} from '@mui/material';
import { ArrowForward, Storefront, ShoppingBag } from '@mui/icons-material';
import api from '../../services/api';
import { resolveImageUrl } from '../../utils/imageUrl';
import ProductCard from '../../components/storefront/ProductCard';
import StoreInfoPanel from '../../components/storefront/StoreInfoPanel';
import HowToOrder from '../../components/storefront/HowToOrder';
import { addToCart } from '../../features/storefront/cartSlice';

export default function StoreHome() {
  const { basePath, primaryColor, storeName, showStock, currency: contextCurrency } = useOutletContext();
  const dispatch = useDispatch();

  const { data: store } = useQuery({
    queryKey: ['store-info'],
    queryFn: () => api.get('/storefront').then((r) => r.data.data),
  });

  const { data: theme } = useQuery({
    queryKey: ['storefront-theme'],
    queryFn: () => api.get('/storefront/theme').then((r) => r.data.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['storefront-categories-home'],
    queryFn: () => api.get('/storefront/categories').then((r) => r.data.data),
  });

  const { data: productsData } = useQuery({
    queryKey: ['storefront-products'],
    queryFn: () => api.get('/storefront/products', { params: { limit: 8 } }).then((r) => r.data),
  });

  const bannerText = theme?.theme?.banner_text
    || 'Order online — inventory and pricing synced with our store in real time.';
  const tagline = theme?.theme?.tagline;
  const featured = productsData?.data || [];
  const logoUrl = resolveImageUrl(theme?.logo_url || store?.logo_url);
  const currency = contextCurrency || store?.currency || 'USD';

  const handleAddToCart = (product) => {
    dispatch(addToCart({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      sale_price: parseFloat(product.sale_price),
      category_name: product.category_name,
      image_url: product.image_url,
      sku: product.sku,
    }));
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
      {/* Store header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { md: 'center' },
          gap: 3,
          p: { xs: 3, md: 4 },
          mb: 4,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: 2,
            bgcolor: alpha(primaryColor, 0.08),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: alpha(primaryColor, 0.15),
          }}
        >
          {logoUrl ? (
            <Box component="img" src={logoUrl} alt={storeName} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Storefront sx={{ fontSize: 36, color: primaryColor }} />
          )}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight={800}>{storeName}</Typography>
          {tagline && (
            <Typography variant="subtitle1" color="primary.main" fontWeight={600} sx={{ mt: 0.5 }}>
              {tagline}
            </Typography>
          )}
          <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 560, lineHeight: 1.6 }}>
            {bannerText}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2, gap: 1 }}>
            <Chip size="small" label="Live inventory" color="success" variant="outlined" />
            <Chip size="small" label={`Prices in ${currency}`} variant="outlined" />
            <Chip size="small" label="POS-connected orders" variant="outlined" />
          </Stack>
        </Box>
        <Stack direction={{ xs: 'row', md: 'column' }} spacing={1} sx={{ flexShrink: 0 }}>
          <Button
            component={Link}
            to={`${basePath}/shop`}
            variant="contained"
            size="large"
            startIcon={<ShoppingBag />}
            sx={{ px: 3 }}
          >
            Browse catalog
          </Button>
          <Button component={Link} to={`${basePath}/cart`} variant="outlined" size="large">
            View cart
          </Button>
        </Stack>
      </Box>

      {/* Categories */}
      {(categories?.length > 0) && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>Shop by category</Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            <Chip
              component={Link}
              to={`${basePath}/shop`}
              label="All products"
              clickable
              color="primary"
              variant="filled"
            />
            {categories.map((c) => (
              <Chip
                key={c.id}
                component={Link}
                to={`${basePath}/shop?category=${c.slug}`}
                label={c.name}
                clickable
                variant="outlined"
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Products */}
      {featured.length > 0 && (
        <Box sx={{ mb: 5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>Available now</Typography>
              <Typography variant="body2" color="text.secondary">
                Stock levels update automatically from our POS
              </Typography>
            </Box>
            <Button component={Link} to={`${basePath}/shop`} endIcon={<ArrowForward />} size="small">
              View all
            </Button>
          </Stack>
          <Grid container spacing={2}>
            {featured.map((p) => (
              <Grid item xs={6} sm={4} md={3} key={p.id}>
                <ProductCard
                  product={p}
                  basePath={basePath}
                  primaryColor={primaryColor}
                  onAddToCart={handleAddToCart}
                  showStock={showStock}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={7}>
          <HowToOrder primaryColor={primaryColor} />
        </Grid>
        <Grid item xs={12} md={5}>
          <StoreInfoPanel store={store} primaryColor={primaryColor} />
        </Grid>
      </Grid>
    </Container>
  );
}
