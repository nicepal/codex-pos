import { useQuery } from '@tanstack/react-query';
import { Grid, Box } from '@mui/material';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import LoadingState from '../../components/LoadingState';

export default function SubscriptionOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['subscription-overview'],
    queryFn: () => api.get('/admin/subscriptions/overview').then((r) => r.data.data),
  });

  if (isLoading) return <LoadingState />;

  return (
    <Box>
      <PageHeader title="Subscription Overview" subtitle="Platform-wide subscription metrics" />
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}><StatCard title="Active Subscriptions" value={data?.active_subscriptions || 0} /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard title="Trialing" value={data?.trialing || 0} /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard title="MRR" value={`$${Number(data?.mrr || 0).toFixed(2)}`} /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard title="Trials Expiring (7d)" value={data?.trials_expiring || 0} /></Grid>
      </Grid>
    </Box>
  );
}
