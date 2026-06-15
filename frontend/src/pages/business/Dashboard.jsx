import { useQuery } from '@tanstack/react-query';
import { Grid, Typography, Box, Card, CardContent } from '@mui/material';
import { AccountBalanceWallet, ShoppingCart, People, Inventory, TrendingUp, TrendingDown } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import LoadingState from '../../components/LoadingState';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';

export default function BusinessDashboard() {
  const { formatMoney } = useBusinessCurrency();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['business-dashboard'],
    queryFn: () => api.get('/reports/dashboard').then((r) => r.data.data),
  });

  const { data: salesData } = useQuery({
    queryKey: ['sales-report'],
    queryFn: () => api.get('/reports/sales?period=daily').then((r) => r.data.data),
  });

  if (isLoading) return <LoadingState />;

  const profitLoss = Number(stats?.profit_loss || 0);
  const chartData = (salesData || []).map((d) => ({
    date: new Date(d.period).toLocaleDateString(),
    revenue: Number(d.revenue),
  }));

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Dashboard</Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Today's Sales" value={formatMoney(stats?.today_sales || 0)} icon={<AccountBalanceWallet color="primary" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Monthly Sales" value={formatMoney(stats?.monthly_sales || 0)} icon={<TrendingUp color="success" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Today's Orders" value={stats?.today_orders || 0} icon={<ShoppingCart color="warning" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Customers" value={stats?.total_customers || 0} icon={<People color="secondary" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Inventory Value" value={formatMoney(stats?.inventory_value || 0)} icon={<Inventory color="info" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Profit / Loss"
            value={formatMoney(Math.abs(profitLoss))}
            icon={profitLoss >= 0 ? <TrendingUp color="success" /> : <TrendingDown color="error" />}
            subtitle={profitLoss >= 0 ? 'Profit this month' : 'Loss this month'}
          />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Sales Trend</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(v) => formatMoney(v)} width={90} />
              <Tooltip formatter={(value) => formatMoney(value)} />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
