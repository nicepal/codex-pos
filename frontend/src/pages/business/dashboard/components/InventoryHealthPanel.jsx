import { Box, Badge, Group, Stack, Table, Text, Button } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { CODEX_TOKENS } from '../../../../design-system';
import DashboardSection from './DashboardSection';
import EmptyState from '../../../../components/EmptyState';

function ProductMiniTable({ rows, onReorder, onAdjust }) {
  if (!rows?.length) return null;
  return (
    <Table striped highlightOnHover withTableBorder={false}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Product</Table.Th>
          <Table.Th ta="right">Stock</Table.Th>
          <Table.Th ta="right">Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.slice(0, 5).map((p) => (
          <Table.Tr key={p.id}>
            <Table.Td>
              <Text size="sm" lineClamp={1} maw={140}>
                {p.name}
              </Text>
              <Text size="xs" c="dimmed">
                {p.sku}
              </Text>
            </Table.Td>
            <Table.Td ta="right">{p.stockQuantity}</Table.Td>
            <Table.Td ta="right">
              <Button size="compact-xs" variant="subtle" onClick={() => onReorder(p.id)}>
                Reorder
              </Button>
              <Button size="compact-xs" variant="subtle" onClick={() => onAdjust(p.id)}>
                Adjust
              </Button>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

export default function InventoryHealthPanel({ inventory, formatMoney, loading, error, onRetry }) {
  const navigate = useNavigate();
  const summary = inventory?.summary;

  const onReorder = (productId) => navigate(`/purchase-orders?productId=${productId}`);
  const onAdjust = (productId) => navigate(`/inventory?productId=${productId}`);

  return (
    <DashboardSection title="Inventory Health" loading={loading} error={error} onRetry={onRetry}>
      {!loading && !summary ? (
        <EmptyState
          compact
          illustration="store"
          title="No inventory data"
          message="Add products to track inventory health."
        />
      ) : null}
      {!loading && summary ? (
        <Box>
          <Group gap="xs" mb="md" wrap="wrap">
            <Badge variant="outline" color="codex">
              Value: {formatMoney(summary.totalValue)}
            </Badge>
            <Badge variant="outline" color="yellow">
              Low: {summary.lowStockCount}
            </Badge>
            <Badge variant="outline" color="red">
              Out: {summary.outOfStockCount}
            </Badge>
            <Badge variant="outline" color="gray">
              Overstocked: {summary.overstockedCount}
            </Badge>
          </Group>

          {summary.outOfStockCount > 0 ? (
            <Box mb="md">
              <Text fw={700} size="sm" c="red" mb="xs">
                Out of Stock
              </Text>
              <ProductMiniTable rows={inventory.outOfStock} onReorder={onReorder} onAdjust={onAdjust} />
            </Box>
          ) : null}

          {summary.lowStockCount > 0 ? (
            <Box mb="md">
              <Text fw={700} size="sm" style={{ color: CODEX_TOKENS.warning }} mb="xs">
                Low Stock
              </Text>
              <ProductMiniTable rows={inventory.lowStock} onReorder={onReorder} onAdjust={onAdjust} />
            </Box>
          ) : null}

          {inventory.recentMovements?.length > 0 ? (
            <Box>
              <Text fw={700} size="sm" mb="xs">
                Recent Stock Movement
              </Text>
              {inventory.recentMovements.slice(0, 5).map((m, i) => (
                <Group key={i} justify="space-between" py={4} wrap="nowrap">
                  <Text size="sm" lineClamp={1} style={{ maxWidth: '70%' }}>
                    {m.productName} · {m.type}
                  </Text>
                  <Text size="sm" c={m.quantity >= 0 ? 'green' : 'red'}>
                    {m.quantity > 0 ? '+' : ''}
                    {m.quantity}
                  </Text>
                </Group>
              ))}
            </Box>
          ) : null}

          {summary.lowStockCount === 0 && summary.outOfStockCount === 0 ? (
            <EmptyState compact illustration="store" title="Inventory healthy" message="No stock issues detected." />
          ) : null}
        </Box>
      ) : null}
    </DashboardSection>
  );
}
