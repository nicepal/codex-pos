import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Box, Typography, Skeleton, Button, Stack, Alert,
} from '@mui/material';
import api from '../../services/api';
import ProductCard from '../../components/storefront/ProductCard';
import StoreHero from '../../components/storefront/StoreHero';
import CategoryNavigation from '../../components/storefront/CategoryNavigation';
import { SF, productGridSx, storefrontStickyTop } from '../../components/storefront/storefrontTheme';

function ProductSkeleton() {
  return (
    <Box
      sx={{
        borderRadius: `${SF.radius.lg}px`,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: SF.colors.border,
      }}
    >
      <Skeleton variant="rectangular" animation="wave" sx={{ aspectRatio: SF.imageRatio }} />
      <Box sx={{ p: 1.25 }}>
        <Skeleton width="88%" height={14} />
        <Skeleton width="42%" height={14} sx={{ mt: 1 }} />
        <Skeleton height={32} sx={{ mt: 1.1, borderRadius: 1 }} />
      </Box>
    </Box>
  );
}

export default function StoreHome() {
  const {
    slug, primaryColor, storeName, showStock,
    logoUrl, store, themeSettings, categories: ctxCategories, openProductDetails,
    searchQuery = '', clearSearch,
    hasPickup, hasDelivery, fulfillmentType, onFulfillmentChange,
  } = useOutletContext();

  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const [activeCategory, setActiveCategory] = useState('');
  const sectionRefs = useRef({});
  const spyLockUntil = useRef(0);
  const q = (searchQuery || '').trim().toLowerCase();
  const searching = q.length > 0;

  const categorySeed = Array.isArray(ctxCategories) && ctxCategories.length > 0
    ? ctxCategories
    : undefined;

  const { data: categoriesData } = useQuery({
    queryKey: ['storefront-categories', slug],
    queryFn: () => api.get('/storefront/categories').then((r) => r.data.data),
    ...(categorySeed ? { initialData: categorySeed } : {}),
  });

  const {
    data: productsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['storefront-products-menu', slug],
    queryFn: () => api.get('/storefront/products', { params: { limit: 100 } }).then((r) => r.data),
  });

  const products = productsData?.data || [];
  const categories = (
    (Array.isArray(categoriesData) && categoriesData.length > 0 && categoriesData)
    || (Array.isArray(ctxCategories) && ctxCategories.length > 0 && ctxCategories)
    || []
  );

  const filteredProducts = useMemo(() => {
    if (!searching) return products;
    return products.filter((p) => {
      const name = String(p.name || '').toLowerCase();
      const cat = String(p.category_name || '').toLowerCase();
      const desc = String(p.description || '').toLowerCase();
      const sku = String(p.sku || '').toLowerCase();
      return name.includes(q) || cat.includes(q) || desc.includes(q) || sku.includes(q);
    });
  }, [products, searching, q]);

  const productsByCategory = useMemo(() => {
    const map = new Map();
    filteredProducts.forEach((p) => {
      const key = p.category_slug || '__uncategorized';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });
    return map;
  }, [filteredProducts]);

  const sections = useMemo(() => {
    const list = [];
    const seen = new Set();

    categories.forEach((c) => {
      const items = productsByCategory.get(c.slug) || [];
      if (!items.length) return;
      list.push({ slug: c.slug, name: c.name, products: items });
      seen.add(c.slug);
    });

    productsByCategory.forEach((items, key) => {
      if (key === '__uncategorized' || seen.has(key) || !items.length) return;
      list.push({
        slug: key,
        name: items[0]?.category_name || 'More',
        products: items,
      });
      seen.add(key);
    });

    const uncategorized = productsByCategory.get('__uncategorized') || [];
    if (uncategorized.length) {
      list.push({ slug: '__uncategorized', name: 'More', products: uncategorized });
    }
    return list;
  }, [categories, productsByCategory]);

  const visibleCategories = useMemo(
    () => sections
      .filter((s) => s.slug !== '__uncategorized')
      .map((s) => ({ id: s.slug, slug: s.slug, name: s.name })),
    [sections],
  );

  const showAnnouncement = themeSettings?.show_announcement !== false;
  const stickyTop = storefrontStickyTop({ isMobile, hasAnnouncement: showAnnouncement });
  const stickyOffset = stickyTop + 44;

  const handleCategorySelect = useCallback((catSlug) => {
    setActiveCategory(catSlug);
    spyLockUntil.current = Date.now() + 800;
    if (!catSlug) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    requestAnimationFrame(() => {
      const el = sectionRefs.current[catSlug];
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - stickyOffset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  }, [stickyOffset]);

  useEffect(() => {
    if (!sections.length || searching) return undefined;

    const updateActive = () => {
      if (Date.now() < spyLockUntil.current) return;
      const probe = stickyOffset + 8;
      let best = '';
      let bestDist = Infinity;
      sections.forEach((s) => {
        const el = sectionRefs.current[s.slug];
        if (!el) return;
        const top = el.getBoundingClientRect().top;
        const dist = Math.abs(top - probe);
        if (top - probe <= 24 && dist < bestDist) {
          bestDist = dist;
          best = s.slug;
        }
      });
      if (window.scrollY < 80) {
        setActiveCategory('');
        return;
      }
      if (best) setActiveCategory(best);
    };

    updateActive();
    window.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive);
    return () => {
      window.removeEventListener('scroll', updateActive);
      window.removeEventListener('resize', updateActive);
    };
  }, [sections, searching, stickyOffset]);

  const description = themeSettings?.banner_text || '';
  const tagline = themeSettings?.tagline || '';

  return (
    <Box>
      <StoreHero
        storeName={storeName}
        logoUrl={logoUrl || store?.logo_url}
        description={description}
        tagline={tagline}
        primaryColor={primaryColor}
        phone={store?.phone}
        address={store?.address}
        hasPickup={hasPickup}
        hasDelivery={hasDelivery}
        fulfillmentType={fulfillmentType}
        onFulfillmentChange={onFulfillmentChange}
      />

      {!searching && visibleCategories.length > 0 && (
        <CategoryNavigation
          categories={visibleCategories}
          activeSlug={activeCategory}
          onSelect={handleCategorySelect}
          primaryColor={primaryColor}
          sticky
          stickyTop={stickyTop}
          allLabel="All"
        />
      )}

      {searching && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mt: 1, mb: 0.5, gap: 1 }}
        >
          <Typography fontWeight={650} sx={{ fontSize: 14 }}>
            Results for “{searchQuery.trim()}”
          </Typography>
          {clearSearch && (
            <Button size="small" onClick={clearSearch} sx={{ fontWeight: 600 }}>
              Clear
            </Button>
          )}
        </Stack>
      )}

      {isError && (
        <Alert
          severity="error"
          sx={{ mt: 2, borderRadius: `${SF.radius.sm}px` }}
          action={<Button color="inherit" size="small" onClick={() => refetch()}>Try again</Button>}
        >
          Couldn’t load products. Please try again.
        </Alert>
      )}

      {isLoading ? (
        <Box sx={[productGridSx(), { mt: 1 }]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </Box>
      ) : products.length === 0 ? (
        <Box
          sx={{
            py: 6,
            px: 2,
            textAlign: 'center',
            borderRadius: `${SF.radius.md}px`,
            bgcolor: SF.colors.paper,
            border: '1px dashed',
            borderColor: SF.colors.border,
            mt: 2,
          }}
        >
          <Typography fontWeight={700} sx={{ letterSpacing: '-0.02em' }} gutterBottom>
            No products yet
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 14, maxWidth: 320, mx: 'auto' }}>
            This store hasn’t published products yet. Check back shortly.
          </Typography>
        </Box>
      ) : searching && filteredProducts.length === 0 ? (
        <Box
          sx={{
            py: 6,
            px: 2,
            textAlign: 'center',
            borderRadius: `${SF.radius.md}px`,
            bgcolor: SF.colors.paper,
            border: '1px dashed',
            borderColor: SF.colors.border,
            mt: 1.5,
          }}
        >
          <Typography fontWeight={700} gutterBottom>
            No products found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2, fontSize: 14 }}>
            Try a different search term.
          </Typography>
          {clearSearch && (
            <Button variant="outlined" onClick={clearSearch}>Clear search</Button>
          )}
        </Box>
      ) : (
        <Stack spacing={{ xs: 2.5, md: 3 }} sx={{ mt: 1.5 }}>
          {sections.map((section) => (
            <Box
              key={section.slug}
              ref={(el) => { sectionRefs.current[section.slug] = el; }}
              id={`cat-${section.slug}`}
              data-cat-slug={section.slug}
              component="section"
              aria-label={section.name}
            >
              <Stack
                direction="row"
                alignItems="baseline"
                justifyContent="space-between"
                sx={{ mb: 1.25, scrollMarginTop: stickyOffset + 8 }}
              >
                <Typography
                  component="h2"
                  fontWeight={750}
                  sx={{
                    fontSize: { xs: 16, md: 18 },
                    letterSpacing: '-0.02em',
                  }}
                >
                  {section.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: 12 }}>
                  {section.products.length} item{section.products.length === 1 ? '' : 's'}
                </Typography>
              </Stack>
              <Box sx={productGridSx()}>
                {section.products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    primaryColor={primaryColor}
                    showStock={showStock}
                    onOpenDetails={openProductDetails}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
