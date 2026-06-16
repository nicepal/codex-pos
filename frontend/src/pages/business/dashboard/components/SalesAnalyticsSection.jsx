import { useState } from 'react';
import { Tabs, Tab, Box, useTheme } from '@mui/material';
import {
  AreaChart, Area, LineChart, Line, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import DashboardSection from './DashboardSection';
import EmptyState from '../../../../components/EmptyState';

function formatPeriod(period) {
  if (!period) return '';
  const d = new Date(period);
  if (Number.isNaN(d.getTime())) return String(period);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function SalesAnalyticsSection({ charts, formatMoney, loading, error, onRetry }) {
  const [tab, setTab] = useState(0);
  const theme = useTheme();

  const salesTrend = charts?.salesTrend || [];
  const revenueVsExpenses = charts?.revenueVsExpenses || [];
  const profitTrend = charts?.profitTrend || [];

  const chartData = tab === 0 ? salesTrend : tab === 1 ? revenueVsExpenses : profitTrend;
  const isEmpty = !loading && chartData.length === 0;

  const tooltipFormatter = (value, name) => {
    if (name === 'marginPct') return [`${value}%`, 'Margin'];
    if (['revenue', 'expenses', 'profit'].includes(name)) return [formatMoney(value), name];
    return [value, name];
  };

  return (
    <DashboardSection
      title="Sales Analytics"
      subtitle="Revenue, expenses, and profit trends"
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, minHeight: 36 }}>
        <Tab label="Daily Sales" />
        <Tab label="Revenue vs Expenses" />
        <Tab label="Profit Trend" />
      </Tabs>

      {isEmpty && (
        <EmptyState
          compact
          illustration="store"
          title="No sales data yet"
          message="Complete your first sale to see analytics here."
          actionLabel="Open POS"
          onAction={() => window.location.assign('/pos')}
        />
      )}

      {!isEmpty && !loading && (
        <Box sx={{ width: '100%', height: 300 }} role="img" aria-label="Sales analytics chart">
          <ResponsiveContainer>
            {tab === 0 && (
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="period" tickFormatter={formatPeriod} fontSize={12} />
                <YAxis tickFormatter={(v) => formatMoney(v)} width={80} fontSize={12} />
                <Tooltip labelFormatter={formatPeriod} formatter={tooltipFormatter} />
                <Area type="monotone" dataKey="revenue" stroke={theme.palette.primary.main} fill="url(#salesGradient)" strokeWidth={2} name="revenue" />
              </AreaChart>
            )}
            {tab === 1 && (
              <ComposedChart data={revenueVsExpenses}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="period" tickFormatter={formatPeriod} fontSize={12} />
                <YAxis tickFormatter={(v) => formatMoney(v)} width={80} fontSize={12} />
                <Tooltip labelFormatter={formatPeriod} formatter={tooltipFormatter} />
                <Legend />
                <Bar dataKey="revenue" fill={theme.palette.primary.main} name="revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill={theme.palette.error.main} name="expenses" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            )}
            {tab === 2 && (
              <LineChart data={profitTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="period" tickFormatter={formatPeriod} fontSize={12} />
                <YAxis yAxisId="left" tickFormatter={(v) => formatMoney(v)} width={80} fontSize={12} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} width={50} fontSize={12} />
                <Tooltip labelFormatter={formatPeriod} formatter={tooltipFormatter} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="profit" stroke={theme.palette.success.main} strokeWidth={2} name="profit" />
                <Line yAxisId="right" type="monotone" dataKey="marginPct" stroke={theme.palette.warning.main} strokeWidth={2} strokeDasharray="4 4" name="marginPct" />
              </LineChart>
            )}
          </ResponsiveContainer>
        </Box>
      )}
    </DashboardSection>
  );
}
