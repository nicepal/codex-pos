import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Box, Typography, Stack, MenuItem, Select, FormControl, InputLabel,
  Pagination, Skeleton, Alert, Button,
} from '@mui/material';
import api from '../../services/api';
import ProductCard from '../../components/storefront/ProductCard';
import CategoryNavigation from '../../components/storefront/CategoryNavigation';
import useDebounce from '../../hooks/useDebounce';
import { SF, productGridSx, storefrontStickyTop } from '../../components/storefront/storefrontTheme';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name A–Z' },
];

function ProductSkeleton() {
  return (
    <Box
      sx={{
        borderRadius: SF.radius.lg,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: SF.colors.borderSubtle,
      }}
    >
      <Skeleton variant="rectangular" animation="wave" sx={{ aspectRatio: SF.imageRatio }} />
      <Box sx={{ p: 1.35 }}>
        <Skeleton width="80%" height={16} />
        <Skeleton width="40%" height={14} sx={{ mt: 1 }} />
        <Skeleton height={38} sx={{ mt: 1.25, borderRadius: 1 }} />
      </Box>
    </Box>
  );
}

export default function StoreShop() {
  const {
    slug, primaryColor, showStock, openProductDetails,
    categories: ctxCategories, themeSettings,
  } = useOutletContext();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [searchParams, setSearchParams] = useSearchParams();
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const category = searchParams.get('category') || '';
  const debouncedSearch = useDebounce(searchParams.get('q') || '', 350);

  const categorySeed = Array.isArray(ctxCategories) && ctxCategories.length > 0
    ? ctxCategories
    : undefined;

  const { data: categories } = useQuery({
    queryKey: ['storefront-categories', slug],
    queryFn: () => api.get('/storefront/categories').then((r) => r.data.data),
    ...(categorySeed ? { initialData: categorySeed } : {}),
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['storefront-shop', slug, debouncedSearch, category, page],
    queryFn: () => api.get('/storefront/products', {
      params: {
        search: debouncedSearch || undefined,
        category: category || undefined,
        page,
        limit: 20,
      },
    }).then((r) => r.data),
  });

  const products = useMemo(() => {
    const list = [...(data?.data || [])];
    switch (sort) {
      case 'price_asc': return list.sort((a, b) => a.sale_price - b.sale_price);
      case 'price_desc': return list.sort((a, b) => b.sale_price - a.sale_price);
      case 'name': return list.sort((a, b) => a.name.localeCompare(b.name));
      default: return list;
    }
  }, [data?.data, sort]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (category) params.set('category', category);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, category, page, setSearchParams]);

  const setCategory = (nextSlug) => {
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (nextSlug) params.set('category', nextSlug);
    else params.delete('category');
    params.delete('page');
    setSearchParams(params, { replace: true });
  };

  const totalPages = data?.pagination?.totalPages || 1;
  const total = data?.pagination?.total ?? 0;
  const categoryName = categories?.find((c) => c.slug === category)?.name;
  const showAnnouncement = themeSettings?.show_announcement !== false;
  const stickyTop = storefrontStickyTop({ isMobile, hasAnnouncement: showAnnouncement });

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        sx={{ mb: 1.25, gap: 1.25, mt: { xs: 1, md: 1.25 } }}
      >
        <Box>
          <Typography
            component="h1"
            fontWeight={750}
            sx={{ fontSize: { xs: 19, md: 22 }, letterSpacing: '-0.025em' }}
          >
            {categoryName || (debouncedSearch ? `Results for “${debouncedSearch}”` : 'All products')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: 13 }}>
            {isFetching ? 'Updating…' : `${total} item${total === 1 ? '' : 's'}`}
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="sort-label">Sort</InputLabel>
          <Select labelId="sort-label" label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {(categories?.length > 0) && (
        <CategoryNavigation
          categories={categories}
          activeSlug={category}
          onSelect={setCategory}
          primaryColor={primaryColor}
          sticky
          stickyTop={stickyTop}
        />
      )}

      {isError && (
        <Alert
          severity="error"
          sx={{ mt: 2, borderRadius: SF.radius.md }}
          action={<Button color="inherit" size="small" onClick={() => refetch()}>Try again</Button>}
        >
          Couldn’t load products. Please try again.
        </Alert>
      )}

      {isLoading ? (
        <Box sx={[productGridSx(), { mt: 1.25 }]}>
          {Array.from({ length: 10 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </Box>
      ) : products.length === 0 ? (
        <Box
          sx={{
            py: 8,
            px: 2,
            textAlign: 'center',
            borderRadius: SF.radius.lg,
            bgcolor: SF.colors.paper,
            border: '1px dashed',
            borderColor: SF.colors.border,
            mt: 2,
          }}
        >
          <Typography fontWeight={750} gutterBottom sx={{ letterSpacing: '-0.02em' }}>
            No products found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2, fontSize: 14 }}>
            Try a different category or search term.
          </Typography>
          <Button variant="outlined" onClick={() => setCategory('')}>View all products</Button>
        </Box>
      ) : (
        <>
          <Box sx={[productGridSx(), { mt: 1.25 }]}>
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                primaryColor={primaryColor}
                onOpenDetails={openProductDetails}
                showStock={showStock}
              />
            ))}
          </Box>
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
