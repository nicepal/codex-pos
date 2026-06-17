import { Card, CardContent, Typography, Grid, Box } from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#ca8a04', '#64748b'];

export default function ExpenseCharts({ monthlyTrend, categoryBreakdown, formatMoney }) {
  const trendData = (monthlyTrend || []).map((r) => ({
    label: new Date(r.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    amount: r.amount,
  }));

  const pieData = (categoryBreakdown || []).map((r) => ({
    name: r.category,
    value: r.amount,
  }));

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} md={7}>
        <Card sx={{ height: '100%', boxShadow: 1 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>Monthly Expense Trend</Typography>
            {trendData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatMoney(v)} />
                  <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>No trend data yet</Box>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={5}>
        <Card sx={{ height: '100%', boxShadow: 1 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>Categories Breakdown</Typography>
            {pieData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatMoney(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>No category data</Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
