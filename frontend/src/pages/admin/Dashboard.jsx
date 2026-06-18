import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Grid, Card, CardContent, Typography, Box, CircularProgress, Button, Stack } from '@mui/material';
import {
  Business, People, ShoppingCart, AttachMoney, TrendingUp,
  MarkEmailRead, ErrorOutline, Schedule, Email, Description,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api from '../../services/api';

function StatCard({ title, value, icon, color }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" variant="body2">{title}</Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>{value}</Typography>
          </Box>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}.50`, color: `${color}.main` }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/businesses/dashboard').then((r) => r.data.data),
  });

  const { data: charts } = useQuery({
    queryKey: ['admin-charts'],
    queryFn: () => api.get('/businesses/charts').then((r) => r.data.data),
  });

  const { data: emailStats } = useQuery({
    queryKey: ['admin-email-stats'],
    queryFn: () => api.get('/admin/email/stats').then((r) => r.data.data),
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Platform Dashboard</Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Businesses" value={stats?.total_businesses || 0} icon={<Business />} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Active Businesses" value={stats?.active_businesses || 0} icon={<TrendingUp />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Users" value={stats?.total_users || 0} icon={<People />} color="secondary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Orders" value={stats?.total_orders || 0} icon={<ShoppingCart />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Monthly Revenue" value={`$${Number(stats?.monthly_revenue || 0).toLocaleString()}`} icon={<AttachMoney />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Trial Businesses" value={stats?.trial_businesses || 0} icon={<Business />} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Suspended" value={stats?.suspended_businesses || 0} icon={<Business />} color="error" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Active Subscriptions" value={stats?.active_subscriptions || 0} icon={<AttachMoney />} color="primary" />
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6">Email Delivery</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" startIcon={<Email />} onClick={() => navigate('/admin/settings/smtp')}>SMTP Settings</Button>
              <Button size="small" startIcon={<MarkEmailRead />} onClick={() => navigate('/admin/settings/email-logs')}>Email Logs</Button>
              <Button size="small" startIcon={<Description />} onClick={() => navigate('/admin/settings/email-templates')}>Templates</Button>
            </Stack>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <StatCard title="Emails Sent Today" value={emailStats?.sent_today || 0} icon={<MarkEmailRead />} color="success" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard title="Failed Emails" value={emailStats?.failed || 0} icon={<ErrorOutline />} color="error" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard title="Queued Emails" value={emailStats?.queued || 0} icon={<Schedule />} color="warning" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Revenue Growth</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={charts?.revenue || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Business Growth</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={charts?.businesses || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7c3aed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
