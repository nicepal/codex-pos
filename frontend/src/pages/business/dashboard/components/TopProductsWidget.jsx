import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import DashboardSection from './DashboardSection';
import EmptyState from '../../../../components/EmptyState';

const BAR_COLOR = '#2563eb';

export default function TopProductsWidget({ products, formatMoney, loading, error, onRetry }) {
  const navigate = useNavigate();

  const data = (products || []).map((p) => ({
    name: p.productName,
    revenue: Number(p.revenue) || 0,
    unitsSold: p.unitsSold,
    productId: p.productId,
  }));

  // Give each bar room to breathe; cap height so long lists stay scannable
  const chartHeight = Math.max(160, data.length * 34);

  const renderTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    return (
      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, boxShadow: 2 }}>
        <Box sx={{ fontWeight: 600, fontSize: 13 }}>{row.name}</Box>
        <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{row.unitsSold} units sold</Box>
        <Box sx={{ fontSize: 13, color: BAR_COLOR, fontWeight: 700 }}>{formatMoney(row.revenue)}</Box>
      </Box>
    );
  };

  return (
    <DashboardSection title="Top Selling Products" subtitle="Top 10 by units sold" loading={loading} error={error} onRetry={onRetry}>
      {!loading && !data.length && (
        <EmptyState compact illustration="store" title="No product sales yet" message="Products will appear here once you start selling." />
      )}
      {!loading && data.length > 0 && (
        <Box sx={{ width: '100%', height: chartHeight }} role="img" aria-label="Top selling products by revenue">
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
      )}
    </DashboardSection>
  );
}
