import { useState } from 'react';
import { Box, Tabs } from '@mantine/core';
import {
  AreaChart, Area, LineChart, Line, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { CODEX_TOKENS } from '../../../../design-system';
import DashboardSection from './DashboardSection';
import EmptyState from '../../../../components/EmptyState';

function formatPeriod(period) {
  if (!period) return '';
  const d = new Date(period);
  if (Number.isNaN(d.getTime())) return String(period);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function SalesAnalyticsSection({ charts, formatMoney, loading, error, onRetry }) {
  const [tab, setTab] = useState('sales');

  const salesTrend = charts?.salesTrend || [];
  const revenueVsExpenses = charts?.revenueVsExpenses || [];
  const profitTrend = charts?.profitTrend || [];

  const chartData =
    tab === 'sales' ? salesTrend : tab === 'revenue' ? revenueVsExpenses : profitTrend;
  const isEmpty = !loading && chartData.length === 0;

  const tooltipFormatter = (value, name) => {
    if (name === 'marginPct') return [`${value}%`, 'Margin'];
    if (['revenue', 'expenses', 'profit'].includes(name)) return [formatMoney(value), name];
    return [value, name];
  };

  const divider = 'var(--mantine-color-default-border)';

  return (
    <DashboardSection
      title="Sales Analytics"
      subtitle="Revenue, expenses, and profit trends"
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      <Tabs value={tab} onChange={setTab} mb="md">
        <Tabs.List>
          <Tabs.Tab value="sales">Daily Sales</Tabs.Tab>
          <Tabs.Tab value="revenue">Revenue vs Expenses</Tabs.Tab>
          <Tabs.Tab value="profit">Profit Trend</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {isEmpty ? (
        <EmptyState
          compact
          illustration="store"
          title="No sales data yet"
          message="Complete your first sale to see analytics here."
          actionLabel="Open POS"
          onAction={() => window.location.assign('/pos')}
        />
      ) : null}

      {!isEmpty && !loading ? (
        <Box w="100%" h={300} role="img" aria-label="Sales analytics chart">
          <ResponsiveContainer>
            {tab === 'sales' ? (
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CODEX_TOKENS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CODEX_TOKENS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={divider} />
                <XAxis dataKey="period" tickFormatter={formatPeriod} fontSize={12} />
                <YAxis tickFormatter={(v) => formatMoney(v)} width={80} fontSize={12} />
                <Tooltip labelFormatter={formatPeriod} formatter={tooltipFormatter} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={CODEX_TOKENS.primary}
                  fill="url(#salesGradient)"
                  strokeWidth={2}
                  name="revenue"
                />
              </AreaChart>
            ) : null}
            {tab === 'revenue' ? (
              <ComposedChart data={revenueVsExpenses}>
                <CartesianGrid strokeDasharray="3 3" stroke={divider} />
                <XAxis dataKey="period" tickFormatter={formatPeriod} fontSize={12} />
                <YAxis tickFormatter={(v) => formatMoney(v)} width={80} fontSize={12} />
                <Tooltip labelFormatter={formatPeriod} formatter={tooltipFormatter} />
                <Legend />
                <Bar dataKey="revenue" fill={CODEX_TOKENS.primary} name="revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill={CODEX_TOKENS.error} name="expenses" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            ) : null}
            {tab === 'profit' ? (
              <LineChart data={profitTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={divider} />
                <XAxis dataKey="period" tickFormatter={formatPeriod} fontSize={12} />
                <YAxis yAxisId="left" tickFormatter={(v) => formatMoney(v)} width={80} fontSize={12} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} width={50} fontSize={12} />
                <Tooltip labelFormatter={formatPeriod} formatter={tooltipFormatter} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="profit" stroke={CODEX_TOKENS.success} strokeWidth={2} name="profit" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="marginPct"
                  stroke={CODEX_TOKENS.warning}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  name="marginPct"
                />
              </LineChart>
            ) : null}
          </ResponsiveContainer>
        </Box>
      ) : null}
    </DashboardSection>
  );
}
