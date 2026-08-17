import { Box, Text, SimpleGrid, Progress, Divider } from '@mantine/core';
import TrendBadge from './TrendBadge';
import DashboardSection from './DashboardSection';

function PeriodBlock({ label, data, formatMoney }) {
  if (!data) return null;
  const trend = data.changePercent > 0 ? 'up' : data.changePercent < 0 ? 'down' : 'flat';
  const progressColor =
    data.marginPct >= 20 ? 'green' : data.marginPct >= 10 ? 'yellow' : 'red';

  return (
    <Box mb="md">
      <Text size="sm" fw={700} c="dimmed" mb="xs">
        {label}
      </Text>
      <SimpleGrid cols={2} spacing="sm" mb="sm">
        <Box>
          <Text size="xs" c="dimmed">
            Revenue
          </Text>
          <Text fw={700}>{formatMoney(data.revenue)}</Text>
        </Box>
        <Box>
          <Text size="xs" c="dimmed">
            Expenses
          </Text>
          <Text fw={700}>{formatMoney(data.expenses)}</Text>
        </Box>
        <Box>
          <Text size="xs" c="dimmed">
            Profit
          </Text>
          <Text fw={700} c={data.profit >= 0 ? 'green' : 'red'}>
            {formatMoney(data.profit)}
          </Text>
        </Box>
        <Box>
          <Text size="xs" c="dimmed">
            Margin
          </Text>
          <Text fw={700}>{data.marginPct}%</Text>
        </Box>
      </SimpleGrid>
      <Box mb="sm">
        <Text size="xs" c="dimmed">
          Profit margin
        </Text>
        <Progress
          value={Math.min(100, Math.max(0, data.marginPct))}
          color={progressColor}
          size="sm"
          radius="xl"
          mt={4}
        />
      </Box>
      <TrendBadge changePercent={data.changePercent} comparisonLabel="vs previous period" trend={trend} />
      <Divider mt="md" />
    </Box>
  );
}

export default function FinancialSummaryCard({ financial, formatMoney, loading, error, onRetry }) {
  return (
    <DashboardSection title="Financial Summary" loading={loading} error={error} onRetry={onRetry}>
      <PeriodBlock label="This Month" data={financial?.month} formatMoney={formatMoney} />
      <PeriodBlock label="This Year" data={financial?.year} formatMoney={formatMoney} />
    </DashboardSection>
  );
}
