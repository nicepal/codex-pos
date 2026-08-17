import { Alert, SimpleGrid, Box } from '@mantine/core';
import { FilterAltOff, Inventory2 } from '@mui/icons-material';
import EmptyState from '../EmptyState';
import { EMPTY_PRESETS } from '../../utils/emptyStatePresets';
import { CodexEmptyState } from '../../design-system';
import ProductCard, { ProductCardSkeleton } from './ProductCard';

export default function ProductGrid({
  products,
  isLoading,
  isError,
  onRetry,
  hasFilters,
  search,
  onClearFilters,
  onAddProduct,
  onAddProductCard,
  formatMoney,
  allowNegativeStock = false,
}) {
  const inStockCount = (products || []).filter((p) => p.stock_quantity > 0).length;

  if (isLoading) {
    return (
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4, xl: 6 }} spacing="sm">
        {Array.from({ length: 12 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </SimpleGrid>
    );
  }

  if (isError) {
    return (
      <CodexEmptyState
        title="Could not load products"
        message="Check your connection and try again."
        actionLabel="Retry"
        onAction={onRetry}
      />
    );
  }

  if (!products?.length) {
    if (hasFilters) {
      const filterHint = search?.trim()
        ? `Nothing matches "${search.trim()}". Try another search or category.`
        : 'No active products in this category. Pick another or view all.';

      return (
        <CodexEmptyState
          icon={<FilterAltOff color="action" />}
          title="No products found"
          message={filterHint}
          actionLabel="Clear filters"
          onAction={onClearFilters}
        />
      );
    }

    // Catalog-empty: keep rich admin EmptyState (onboarding benefits) for first-run UX
    const preset = EMPTY_PRESETS.pos;
    return (
      <EmptyState
        illustration={preset.illustration}
        title={preset.title}
        message={preset.message}
        actionLabel={preset.actionLabel}
        actionIcon={<Inventory2 />}
        onAction={onAddProduct}
        benefits={preset.benefits}
      />
    );
  }

  return (
    <Box>
      {inStockCount === 0 && !allowNegativeStock && (
        <Alert color="yellow" mb="sm" title="Out of stock">
          All matching products are out of stock. Restock or enable negative stock to sell.
        </Alert>
      )}
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4, xl: 6 }} spacing="sm">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            formatMoney={formatMoney}
            onAdd={onAddProductCard}
            allowNegativeStock={allowNegativeStock}
          />
        ))}
      </SimpleGrid>
    </Box>
  );
}
