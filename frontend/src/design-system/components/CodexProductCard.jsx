import { Box, Text, Skeleton, Image } from '@mantine/core';
import CodexCard from './CodexCard';
import CodexBadge from './CodexBadge';
import { resolveImageUrl } from '../../utils/imageUrl';
import { CODEX_TOKENS } from '../theme/codexTheme';

function stockBadge(qty) {
  if (qty <= 0) return { label: 'Out', color: 'red' };
  if (qty <= 10) return { label: `Low ${qty}`, color: 'yellow' };
  return { label: String(qty), color: 'gray' };
}

export function CodexProductCardSkeleton() {
  return (
    <CodexCard padding={0} style={{ height: '100%', overflow: 'hidden' }}>
      <Skeleton height={88} radius={0} />
      <Box p="sm">
        <Skeleton height={14} width="85%" mb={8} />
        <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Skeleton height={18} width="40%" />
          <Skeleton height={18} width={40} />
        </Box>
      </Box>
    </CodexCard>
  );
}

/**
 * POS product tile — Mantine implementation of the former MUI ProductCard.
 * Props match the previous ProductCard API so POS.jsx stays unchanged.
 */
export default function CodexProductCard({ product, formatMoney, onAdd, allowNegativeStock }) {
  const stock = stockBadge(product.stock_quantity);
  const isVariable = product.product_type === 'variable';
  const outOfStock = !isVariable && product.stock_quantity <= 0;
  const disabled = outOfStock && !allowNegativeStock;

  return (
    <CodexCard
      interactive={!disabled}
      padding={0}
      shadow="none"
      style={{
        height: '100%',
        minHeight: CODEX_TOKENS.touchMin,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        overflow: 'hidden',
      }}
      onClick={() => !disabled && onAdd(product)}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.borderColor = CODEX_TOKENS.primary;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '';
        e.currentTarget.style.transform = '';
      }}
    >
      {product.image_url ? (
        <Image
          src={resolveImageUrl(product.image_url)}
          alt={product.name}
          h={88}
          fit="cover"
        />
      ) : (
        <Box
          h={88}
          style={{
            background: 'var(--mantine-color-gray-1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text c="dimmed" fw={700} size="xl">
            {product.name?.[0]}
          </Text>
        </Box>
      )}
      <Box p="sm" pb={10}>
        <Text size="sm" fw={600} lineClamp={1} title={product.name}>
          {product.name}
        </Text>
        {product.sku ? (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {product.sku}
          </Text>
        ) : null}
        <Box
          mt={6}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}
        >
          <Text c="codex" fw={700} size="sm">
            {formatMoney(product.sale_price)}
          </Text>
          <CodexBadge color={stock.color} size="sm" variant="light">
            {stock.label}
          </CodexBadge>
        </Box>
      </Box>
    </CodexCard>
  );
}
