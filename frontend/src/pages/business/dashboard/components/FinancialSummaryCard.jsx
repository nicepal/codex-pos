import { Box, Typography, Divider, LinearProgress } from '@mui/material';
import TrendBadge from './TrendBadge';
import DashboardSection from './DashboardSection';

function PeriodBlock({ label, data, formatMoney }) {
  if (!data) return null;
  const trend = data.changePercent > 0 ? 'up' : data.changePercent < 0 ? 'down' : 'flat';

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Revenue</Typography>
          <Typography variant="body1" fontWeight={700}>{formatMoney(data.revenue)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Expenses</Typography>
          <Typography variant="body1" fontWeight={700}>{formatMoney(data.expenses)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Profit</Typography>
          <Typography variant="body1" fontWeight={700} color={data.profit >= 0 ? 'success.main' : 'error.main'}>
            {formatMoney(data.profit)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Margin</Typography>
          <Typography variant="body1" fontWeight={700}>{data.marginPct}%</Typography>
        </Box>
      </Box>
      <Box sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary">Profit margin</Typography>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, Math.max(0, data.marginPct))}
          color={data.marginPct >= 20 ? 'success' : data.marginPct >= 10 ? 'warning' : 'error'}
          sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
        />
      </Box>
      <TrendBadge
        changePercent={data.changePercent}
        comparisonLabel="vs previous period"
        trend={trend}
      />
      <Divider sx={{ mt: 2 }} />
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
