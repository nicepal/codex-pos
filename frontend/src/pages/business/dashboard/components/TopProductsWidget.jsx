import { Box, Paper, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import DashboardSection from './DashboardSection';
import EmptyState from '../../../../components/EmptyState';
import { CODEX_TOKENS } from '../../../../design-system';

const BAR_COLOR = CODEX_TOKENS.primary;

export default function TopProductsWidget({ products, formatMoney, loading, error, onRetry }) {
  const navigate = useNavigate();

  const data = (products || []).map((p) => ({
    name: p.productName,
    revenue: Number(p.revenue) || 0,
    unitsSold: p.unitsSold,
    productId: p.productId,
  }));

  const chartHeight = Math.max(160, data.length * 34);

  const renderTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    return (
      <Paper withBorder p="xs" shadow="sm">
        <Text fw={600} size="sm">
          {row.name}
        </Text>
        <Text size="xs" c="dimmed">
          {row.unitsSold} units sold
        </Text>
        <Text size="sm" fw={700} c="codex">
          {formatMoney(row.revenue)}
        </Text>
      </Paper>
    );
  };

  return (
    <DashboardSection
      title="Top Selling Products"
      subtitle="Top 10 by units sold"
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {!loading && !data.length ? (
        <EmptyState
          compact
          illustration="store"
          title="No product sales yet"
          message="Products will appear here once you start selling."
        />
      ) : null}
      {!loading && data.length > 0 ? (
        <Box w="100%" h={chartHeight} role="img" aria-label="Top selling products by revenue">
          <ResponsiveContainer>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
              barCategoryGap={8}
            >
              <XAxis type="number" tickFormatter={(v) => formatMoney(v)} fontSize={11} />
              <YAxis type="category" dataKey="name" width={130} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'rgba(37,99,235,0.06)' }} content={renderTooltip} />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]} cursor="pointer">
                {data.map((row) => (
                  <Cell
                    key={row.productId || row.name}
                    fill={BAR_COLOR}
                    onClick={() => row.productId && navigate('/products')}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      ) : null}
    </DashboardSection>
  );
}
