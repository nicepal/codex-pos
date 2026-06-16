import { Grid, Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import DashboardSection from './DashboardSection';
import TrendBadge from './TrendBadge';
import EmptyState from '../../../../components/EmptyState';

function MiniStat({ label, value }) {
  return (
    <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
      <Typography variant="h5" fontWeight={700}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  );
}

export default function CustomerInsightsPanel({ customers, formatMoney, loading, error, onRetry }) {
  return (
    <DashboardSection title="Customer Insights" loading={loading} error={error} onRetry={onRetry}>
      {!loading && !customers && (
        <EmptyState compact illustration="store" title="No customer data" message="Add customers to see insights." />
      )}
      {!loading && customers && (
        <Box>
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <MiniStat label="New Today" value={customers.newToday} />
            </Grid>
            <Grid item xs={6}>
              <MiniStat label="Returning Today" value={customers.returningToday} />
            </Grid>
            <Grid item xs={6}>
              <MiniStat label="New This Month" value={customers.newThisMonth} />
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
                <TrendBadge
                  changePercent={customers.growthPercent}
                  comparisonLabel="growth"
                  trend={customers.growthPercent > 0 ? 'up' : customers.growthPercent < 0 ? 'down' : 'flat'}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Customer Growth
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Typography variant="subtitle2" fontWeight={700} gutterBottom>Top Customers</Typography>
          {!customers.topCustomers?.length && (
            <Typography variant="body2" color="text.secondary">No customer purchases yet.</Typography>
          )}
          <List disablePadding dense>
            {customers.topCustomers?.map((c) => (
              <ListItem key={c.id} disablePadding sx={{ py: 0.75 }}>
                <ListItemText
                  primary={c.name}
                  secondary={`${c.orderCount} orders`}
                />
                <Typography variant="body2" fontWeight={700} color="primary.main">
                  {formatMoney(c.totalSpent)}
                </Typography>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </DashboardSection>
  );
}
