import { useParams, useOutletContext, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Grid, Button, Alert, Skeleton, Breadcrumbs, Link as MuiLink,
} from '@mui/material';
import { ArrowBack, NavigateNext } from '@mui/icons-material';
import api from '../../services/api';
import ProductDetails from '../../components/storefront/ProductDetails';
import ProductCard from '../../components/storefront/ProductCard';
import ProductReviews from '../../components/storefront/ProductReviews';
import { SF } from '../../components/storefront/storefrontTheme';

export default function StoreProduct() {
  const { productSlug } = useParams();
  const { basePath, slug, primaryColor, showStock, openProductDetails } = useOutletContext();

  const { data: product, isLoading, isError, refetch } = useQuery({
    queryKey: ['storefront-product', slug, productSlug],
    queryFn: () => api.get(`/storefront/products/${productSlug}`).then((r) => r.data.data),
  });

  return (
    <Box sx={{ pb: 2 }}>
      <Button
        component={Link}
        to={basePath}
        startIcon={<ArrowBack />}
        color="inherit"
        size="small"
        sx={{
          mb: 1.5,
          color: 'text.secondary',
          fontWeight: 600,
          px: 0.5,
          '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
        }}
      >
        Back to menu
      </Button>

      {product && (
        <Breadcrumbs
          separator={<NavigateNext sx={{ fontSize: 16 }} />}
          sx={{ mb: 2, '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' } }}
          aria-label="Product breadcrumb"
        >
          <MuiLink
            component={Link}
            to={basePath}
            underline="hover"
            color="text.secondary"
            sx={{ fontSize: 13, fontWeight: 550 }}
          >
            Menu
          </MuiLink>
          {product.category_name && (
            <MuiLink
              component={Link}
              to={`${basePath}/shop?category=${encodeURIComponent(product.category_slug || '')}`}
              underline="hover"
              color="text.secondary"
              sx={{ fontSize: 13, fontWeight: 550 }}
            >
              {product.category_name}
            </MuiLink>
          )}
          <Typography color="text.primary" sx={{ fontSize: 13, fontWeight: 650 }} noWrap>
            {product.name}
          </Typography>
        </Breadcrumbs>
      )}

      {isError && (
        <Alert
          severity="error"
          sx={{ borderRadius: `${SF.radius.md}px` }}
          action={<Button color="inherit" size="small" onClick={() => refetch()}>Try again</Button>}
        >
          Unable to load this product.
        </Alert>
      )}

      {isLoading ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3,
          }}
        >
          <Skeleton variant="rectangular" sx={{ aspectRatio: '1', borderRadius: `${SF.radius.md}px` }} />
          <Box>
            <Skeleton width="40%" height={24} />
            <Skeleton width="75%" height={40} sx={{ mt: 1.5 }} />
            <Skeleton width="30%" height={32} sx={{ mt: 2 }} />
            <Skeleton height={80} sx={{ mt: 2 }} />
            <Skeleton height={48} sx={{ mt: 3, borderRadius: 1 }} />
          </Box>
        </Box>
      ) : product ? (
        <>
          <Box
            sx={{
              bgcolor: SF.colors.paper,
              borderRadius: `${SF.radius.lg}px`,
              border: '1px solid',
              borderColor: SF.colors.border,
              p: { xs: 1.5, md: 2.5 },
              boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
            }}
          >
            <ProductDetails
              product={product}
              primaryColor={primaryColor}
              showStock={showStock}
              basePath={basePath}
              embedded
              layout="page"
            />
          </Box>

          {product.related?.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography
                component="h2"
                fontWeight={750}
                sx={{ fontSize: { xs: 16, md: 18 }, letterSpacing: '-0.02em', mb: 1.5 }}
              >
                You may also like
              </Typography>
              <Grid container spacing={{ xs: 1.25, sm: 1.5 }}>
                {product.related.map((p) => (
                  <Grid item xs={6} sm={4} md={3} key={p.id}>
                    <ProductCard
                      product={p}
                      primaryColor={primaryColor}
                      onOpenDetails={openProductDetails}
                      showStock={showStock}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          <Box sx={{ mt: 4 }}>
            <ProductReviews productSlug={product.slug} compactEmpty />
          </Box>
        </>
      ) : !isError ? (
        <Box
          sx={{
            py: 8,
            px: 2,
            textAlign: 'center',
            bgcolor: SF.colors.paper,
            borderRadius: `${SF.radius.md}px`,
            border: '1px dashed',
            borderColor: SF.colors.border,
          }}
        >
          <Typography fontWeight={700} gutterBottom>Product not found</Typography>
          <Typography color="text.secondary" sx={{ mb: 2, fontSize: 14 }}>
            This item may have been removed or is unavailable.
          </Typography>
          <Button component={Link} to={basePath} variant="contained">Back to menu</Button>
        </Box>
      ) : null}
    </Box>
  );
}
