import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Grid, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';

export default function ReportsPage() {
  const { formatMoney } = useBusinessCurrency();
  const { data: financial } = useQuery({
    queryKey: ['financial-report'],
    queryFn: () => api.get('/reports/financial').then((r) => r.data.data),
  });

  const { data: topProducts } = useQuery({
    queryKey: ['top-products'],
    queryFn: () => api.get('/reports/top-products').then((r) => r.data.data),
  });

  const { data: sales } = useQuery({
    queryKey: ['sales-monthly'],
    queryFn: () => api.get('/reports/sales?period=monthly').then((r) => r.data.data),
  });

  const { data: advanced } = useQuery({
    queryKey: ['reports-advanced'],
    queryFn: () => api.get('/reports/advanced').then((r) => r.data.data),
  });

  const chartData = (sales || []).map((d) => ({
    period: new Date(d.period).toLocaleDateString('en', { month: 'short', year: '2-digit' }),
    revenue: Number(d.revenue),
  }));

  const hourlyData = (advanced?.hourly || []).map((h) => ({ hour: `${h.hour}:00`, revenue: Number(h.revenue) }));

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Reports</Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card><CardContent>
            <Typography color="text.secondary">Revenue</Typography>
            <Typography variant="h4" color="success.main">{formatMoney(financial?.revenue || 0)}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card><CardContent>
            <Typography color="text.secondary">Expenses</Typography>
            <Typography variant="h4" color="error.main">{formatMoney(financial?.expenses || 0)}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card><CardContent>
            <Typography color="text.secondary">Profit</Typography>
            <Typography variant="h4">{formatMoney(financial?.profit || 0)}</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="h6" gutterBottom>Monthly Sales</Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(v) => formatMoney(v)} width={90} />
                <Tooltip formatter={(value) => formatMoney(value)} />
                <Bar dataKey="revenue" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="h6" gutterBottom>Top Selling Products</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Qty Sold</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(topProducts || []).map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>{p.product_name}</TableCell>
                      <TableCell align="right">{p.total_qty}</TableCell>
                      <TableCell align="right">{formatMoney(p.total_revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="h6" gutterBottom>Hourly Sales (30 days)</Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis tickFormatter={(v) => formatMoney(v)} width={90} />
                <Tooltip formatter={(value) => formatMoney(value)} />
                <Bar dataKey="revenue" fill="#7c3aed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </Grid>
      </Grid>
    </Box>
  );
}
