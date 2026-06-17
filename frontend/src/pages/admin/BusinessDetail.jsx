import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Typography, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import api from '../../services/api';
import { setTokens } from '../../features/auth/authSlice';
import LoadingState from '../../components/LoadingState';
import BusinessOverviewDashboard, { DashboardSkeleton } from './business-detail/BusinessOverviewDashboard';

export default function BusinessDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState('');

  const { data: dashboard, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['business-dashboard', id],
    queryFn: () => api.get(`/businesses/${id}/dashboard`).then((r) => r.data.data),
  });

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then((r) => r.data.data),
  });

  const action = useMutation({
    mutationFn: ({ url, method = 'post', body }) => api[method](url, body),
    onSuccess: () => {
      queryClient.invalidateQueries(['business-dashboard', id]);
      queryClient.invalidateQueries(['business', id]);
      setSelectedPlan('');
    },
  });

  const impersonate = useMutation({
    mutationFn: () => api.post('/auth/impersonate', { tenant_id: id }),
    onSuccess: (res) => {
      dispatch(setTokens({
        accessToken: res.data.data.accessToken,
        refreshToken: res.data.data.refreshToken,
      }));
      localStorage.setItem('tenantSlug', dashboard?.business?.slug);
      navigate('/dashboard');
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin/businesses')} sx={{ mb: 3 }}>
          Back to Businesses
        </Button>
        <DashboardSkeleton />
      </Box>
    );
  }

  if (isError || !dashboard) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin/businesses')} sx={{ mb: 3 }}>
          Back to Businesses
        </Button>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.response?.data?.message || 'Failed to load business dashboard'}
        </Alert>
        <Button variant="contained" onClick={() => refetch()}>Retry</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/admin/businesses')}
        sx={{ mb: 3, color: 'primary.main', fontWeight: 600, px: 0 }}
      >
        Back to Businesses
      </Button>

      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Business Overview
      </Typography>

      <BusinessOverviewDashboard
        dashboard={dashboard}
        plans={plans}
        selectedPlan={selectedPlan}
        onPlanChange={setSelectedPlan}
        businessStatus={dashboard.business.status}
        actionPending={action.isPending}
        impersonatePending={impersonate.isPending}
        onSuspend={() => action.mutate({ url: `/businesses/${id}/suspend` })}
        onActivate={() => action.mutate({ url: `/businesses/${id}/activate` })}
        onExtendTrial={() => action.mutate({ url: `/businesses/${id}/extend-trial`, body: { days: 14 } })}
        onUpgradePlan={() => action.mutate({
          url: `/businesses/${id}/upgrade-plan`,
          body: { plan_id: selectedPlan, billing_cycle: 'monthly' },
        })}
        onImpersonate={() => impersonate.mutate()}
        onViewAuditLogs={() => navigate(`/admin/audit-logs?tenant_id=${id}`)}
      />
    </Box>
  );
}
