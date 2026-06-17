import { Card, CardContent, Typography, Grid, Stack, LinearProgress, Box } from '@mui/material';

export default function ExpenseSummaryPanel({ summary, pending, formatMoney }) {
  if (!summary) return null;

  return (
    <Card sx={{ boxShadow: 1, height: '100%' }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>Expense Summary</Typography>
        <Stack spacing={2}>
          {[
            { label: 'Total Expenses', value: formatMoney(summary.total) },
            { label: 'Average Expense', value: formatMoney(summary.average) },
            { label: 'Highest Expense', value: formatMoney(summary.highest) },
            { label: 'Lowest Expense', value: formatMoney(summary.lowest) },
          ].map((item) => (
            <Box key={item.label}>
              <Typography variant="caption" color="text.secondary">{item.label}</Typography>
              <Typography fontWeight={700}>{item.value}</Typography>
            </Box>
          ))}
          {pending?.count > 0 && (
            <Box sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="warning.main" fontWeight={600}>Pending approval</Typography>
              <Typography fontWeight={700}>{pending.count} · {formatMoney(pending.amount)}</Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ExpenseFinancialImpact({ financial, formatMoney }) {
  if (!financial) return null;
  const { revenue, expenses, profit, profitMarginPercent } = financial;
  const expensePct = revenue > 0 ? Math.min(100, (expenses / revenue) * 100) : 0;
  const profitPct = revenue > 0 ? Math.max(0, (profit / revenue) * 100) : 0;

  return (
    <Card sx={{ boxShadow: 1, height: '100%' }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>Financial Impact (This Month)</Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">Revenue</Typography>
            <Typography fontWeight={700} color="success.main">{formatMoney(revenue)}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">Expenses</Typography>
            <Typography fontWeight={700} color="error.main">{formatMoney(expenses)}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">Net Profit</Typography>
            <Typography fontWeight={700} color={profit >= 0 ? 'success.main' : 'error.main'}>{formatMoney(profit)}</Typography>
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary">Expense ratio</Typography>
        <LinearProgress variant="determinate" value={expensePct} color="error" sx={{ mb: 1, height: 8, borderRadius: 4 }} />
        <Typography variant="caption" color="text.secondary">Profit margin {profitMarginPercent}%</Typography>
        <LinearProgress variant="determinate" value={profitPct} color="success" sx={{ height: 8, borderRadius: 4 }} />
      </CardContent>
    </Card>
  );
}

export function TopCategoriesPanel({ categories, formatMoney }) {
  return (
    <Card sx={{ boxShadow: 1 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>Top Expense Categories</Typography>
        {!categories?.length ? (
          <Typography color="text.secondary" variant="body2">No category data for selected filters.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {categories.map((c) => (
              <Box key={c.category}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={600}>{c.category}</Typography>
                  <Typography fontWeight={700}>{formatMoney(c.amount)}</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LinearProgress variant="determinate" value={c.percentage} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
                  <Typography variant="caption" color="text.secondary">{c.percentage}%</Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
