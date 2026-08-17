import { useQuery } from '@tanstack/react-query';
import { Stack, Text, UnstyledButton, Group, Divider, Center, Loader } from '@mantine/core';
import { CodexModal } from '../../design-system';
import api from '../../services/api';

export default function VariantPickerDialog({ productId, open, onClose, onSelect, formatMoney }) {
  const { data: product, isLoading } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => api.get(`/products/${productId}`).then((r) => r.data.data),
    enabled: !!productId && open,
  });

  return (
    <CodexModal opened={open} onClose={onClose} size="sm" title="Select variant">
      <Stack gap="xs">
        {isLoading && (
          <Center py="md"><Loader size="sm" /></Center>
        )}
        {!isLoading && !(product?.variants?.length) && (
          <Text c="dimmed">No variants configured for this product.</Text>
        )}
        {(product?.variants || []).map((v) => (
          <UnstyledButton
            key={v.id}
            disabled={v.stock_quantity <= 0}
            onClick={() => onSelect({
              product_id: product.id,
              variant_id: v.id,
              product_name: `${product.name} - ${v.name}`,
              sku: v.sku,
              unit_price: parseFloat(v.sale_price),
            })}
            style={{
              minHeight: 48,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--mantine-color-gray-2)',
              opacity: v.stock_quantity <= 0 ? 0.5 : 1,
              cursor: v.stock_quantity <= 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <div>
                <Text fw={600}>{v.name}</Text>
                <Text size="xs" c="dimmed">
                  {formatMoney(v.sale_price)} · Stock: {v.stock_quantity}
                </Text>
              </div>
            </Group>
          </UnstyledButton>
        ))}
        <Divider />
      </Stack>
    </CodexModal>
  );
}
