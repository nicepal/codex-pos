import { useEffect, useMemo } from 'react';
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
import { resolveProductImageSrc } from '../../utils/imageUrl';
import { customerFacingDescription } from '../../utils/storefrontContent';
import { applyDocumentSeo, toAbsoluteUrl } from '../../utils/documentSeo';
import useStoreCurrency from '../../hooks/useStoreCurrency';

export default function StoreProduct() {
  const { productSlug } = useParams();
  const {
    basePath, slug, primaryColor, showStock, openProductDetails, storeName, currency,
  } = useOutletContext();
  const { formatMoney } = useStoreCurrency();

  const { data: product, isLoading, isError, refetch } = useQuery({
    queryKey: ['storefront-product', slug, productSlug],
    queryFn: () => api.get(`/storefront/products/${productSlug}`).then((r) => r.data.data),
  });

  const productUrl = useMemo(() => {
    if (typeof window === 'undefined' || !product?.slug) return undefined;
    return `${window.location.origin}${basePath}/product/${product.slug}`;
  }, [basePath, product?.slug]);

  const imageUrl = useMemo(
    () => toAbsoluteUrl(resolveProductImageSrc(product) || product?.images?.[0]?.url),
    [product],
  );

  const description = useMemo(() => {
    const fromProduct = customerFacingDescription(product?.description);
    if (fromProduct) return fromProduct;
    if (product?.name && storeName) return `${product.name} available at ${storeName}. Order online.`;
    return product?.name || '';
  }, [product, storeName]);

  useEffect(() => {
    if (!product?.name) return undefined;

    const price = parseFloat(product.sale_price);
    const priceValid = Number.isFinite(price) && price >= 0;
    const title = storeName ? `${product.name} | ${storeName}` : product.name;

    return applyDocumentSeo({
      title,
      description,
      image: imageUrl,
      url: productUrl || `${basePath}/product/${product.slug}`,
      type: 'product',
      siteName: storeName || 'Store',
      jsonLdId: 'storefront-product',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: description || undefined,
        image: imageUrl ? [imageUrl] : undefined,
        sku: product.sku || undefined,
        url: productUrl,
        category: product.category_name || undefined,
        brand: storeName ? { '@type': 'Brand', name: storeName } : undefined,
        offers: priceValid ? {
          '@type': 'Offer',
          priceCurrency: currency || 'USD',
          price: price.toFixed(2),
          availability: Number(product.stock_quantity) > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          url: productUrl,
        } : undefined,
      },
    });
  }, [
    product, storeName, description, imageUrl, productUrl, basePath, currency,
  ]);

  const priceLabel = product
    ? formatMoney(parseFloat(product.sale_price))
    : undefined;

  return (
    <Box sx={{ pb: 2 }} component="article" itemScope itemType="https://schema.org/Product">
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
          <Typography color="text.primary" sx={{ fontSize: 13, fontWeight: 650 }} noWrap itemProp="name">
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
              storeName={storeName}
              shareUrl={productUrl}
              priceLabel={priceLabel}
              embedded
              layout="page"
            />
          </Box>

          {product.related?.length > 0 && (
            <Box sx={{ mt: 4 }} component="section" aria-label="Related products">
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
