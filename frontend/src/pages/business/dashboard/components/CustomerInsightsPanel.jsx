import { Box, Text, SimpleGrid, Stack, Group } from '@mantine/core';
import DashboardSection from './DashboardSection';
import TrendBadge from './TrendBadge';
import EmptyState from '../../../../components/EmptyState';

function MiniStat({ label, value }) {
  return (
    <Box
      p="sm"
      ta="center"
      style={{
        background: 'var(--mantine-color-default-hover)',
        borderRadius: 8,
      }}
    >
      <Text fw={700} style={{ fontSize: '1.35rem' }}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Box>
  );
}

export default function CustomerInsightsPanel({ customers, formatMoney, loading, error, onRetry }) {
  return (
    <DashboardSection title="Customer Insights" loading={loading} error={error} onRetry={onRetry}>
      {!loading && !customers ? (
        <EmptyState compact illustration="store" title="No customer data" message="Add customers to see insights." />
      ) : null}
      {!loading && customers ? (
        <Box>
          <SimpleGrid cols={2} spacing="sm" mb="md">
            <MiniStat label="New Today" value={customers.newToday} />
            <MiniStat label="Returning Today" value={customers.returningToday} />
            <MiniStat label="New This Month" value={customers.newThisMonth} />
            <Box
              p="sm"
              ta="center"
              style={{
                background: 'var(--mantine-color-default-hover)',
                borderRadius: 8,
              }}
            >
              <TrendBadge
                changePercent={customers.growthPercent}
                comparisonLabel="growth"
                trend={
                  customers.growthPercent > 0
                    ? 'up'
                    : customers.growthPercent < 0
                      ? 'down'
                      : 'flat'
                }
              />
              <Text size="xs" c="dimmed" mt={4}>
                Customer Growth
              </Text>
            </Box>
          </SimpleGrid>

          <Text fw={700} size="sm" mb="xs">
            Top Customers
          </Text>
          {!customers.topCustomers?.length ? (
            <Text size="sm" c="dimmed">
              No customer purchases yet.
            </Text>
          ) : null}
          <Stack gap="xs">
            {customers.topCustomers?.map((c) => (
              <Group key={c.id} justify="space-between" wrap="nowrap">
                <Stack gap={0} style={{ minWidth: 0 }}>
                  <Text size="sm" fw={500} lineClamp={1}>
                    {c.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {c.orderCount} orders
                  </Text>
                </Stack>
                <Text size="sm" fw={700} c="codex">
                  {formatMoney(c.totalSpent)}
                </Text>
              </Group>
            ))}
          </Stack>
        </Box>
      ) : null}
    </DashboardSection>
  );
}
