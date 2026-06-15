import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Box, Typography, Grid, Chip, Stack, MenuItem, Select, FormControl, InputLabel,
  Pagination, Skeleton,
} from '@mui/material';
import api from '../../services/api';
import ProductCard from '../../components/storefront/ProductCard';
import StoreBreadcrumbs from '../../components/storefront/StoreBreadcrumbs';
import EmptyState from '../../components/EmptyState';
import useDebounce from '../../hooks/useDebounce';
import { addToCart } from '../../features/storefront/cartSlice';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name A–Z' },
];

function ProductSkeleton() {
  return (
    <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
      <Skeleton variant="rectangular" sx={{ pt: '85%' }} />
      <Box sx={{ p: 2 }}>
        <Skeleton width="80%" />
        <Skeleton width="40%" sx={{ mt: 1 }} />
        <Skeleton height={36} sx={{ mt: 2 }} />
      </Box>
    </Box>
  );
}

export default function StoreShop() {
  const { basePath, primaryColor, showStock } = useOutletContext();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const category = searchParams.get('category') || '';
  const debouncedSearch = useDebounce(searchParams.get('q') || '', 350);

  const { data: categories } = useQuery({
    queryKey: ['storefront-categories'],
    queryFn: () => api.get('/storefront/categories').then((r) => r.data.data),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['storefront-shop', debouncedSearch, category, page],
    queryFn: () => api.get('/storefront/products', {
      params: {
        search: debouncedSearch || undefined,
        category: category || undefined,
        page,
        limit: 12,
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

  const setCategory = (slug) => {
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (slug) params.set('category', slug);
    else params.delete('category');
    setSearchParams(params, { replace: true });
  };

  const handleAddToCart = (product) => {
    dispatch(addToCart({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      sale_price: parseFloat(product.sale_price),
      category_name: product.category_name,
      image_url: product.image_url,
    }));
  };

  const totalPages = data?.pagination?.totalPages || 1;
  const total = data?.pagination?.total ?? 0;
  const categoryName = categories?.find((c) => c.slug === category)?.name;

  const breadcrumbItems = [
    { label: 'Home', to: basePath },
    { label: 'Shop', to: `${basePath}/shop` },
  ];
  if (categoryName) {
    breadcrumbItems.push({ label: categoryName, to: `${basePath}/shop?category=${category}` });
  }

  return (
    <Box>
      <StoreBreadcrumbs items={breadcrumbItems} />

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 3, gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            {categoryName || 'All Products'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {isFetching ? 'Updating…' : `${total} product${total === 1 ? '' : 's'}`}
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="sort-label">Sort by</InputLabel>
          <Select labelId="sort-label" label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {(categories?.length > 0) && (
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
          <Chip
            label="All"
            onClick={() => setCategory('')}
            variant={!category ? 'filled' : 'outlined'}
            color={!category ? 'primary' : 'default'}
            sx={{ fontWeight: 600 }}
          />
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              onClick={() => setCategory(c.slug)}
              variant={category === c.slug ? 'filled' : 'outlined'}
              color={category === c.slug ? 'primary' : 'default'}
            />
          ))}
        </Stack>
      )}

      {isLoading ? (
        <Grid container spacing={2.5}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid item xs={6} sm={4} md={3} key={i}><ProductSkeleton /></Grid>
          ))}
        </Grid>
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          message="Try a different category or search term."
          actionLabel="View all products"
          onAction={() => setCategory('')}
        />
      ) : (
        <>
          <Grid container spacing={2.5}>
            {products.map((p) => (
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
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
              <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
