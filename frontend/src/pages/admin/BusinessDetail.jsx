import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Grid, Button, MenuItem, TextField,
  Stack, IconButton, Tooltip, alpha, useTheme,
} from '@mui/material';
import {
  ArrowBack, Login, Store, ContentCopy, InfoOutlined, BoltOutlined,
  LocalOffer, Phone, Language, WorkspacePremium, CreditCard, CalendarToday,
  PauseCircleOutline, Schedule, Upgrade, ShieldOutlined, DescriptionOutlined,
} from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import api from '../../services/api';
import { setTokens } from '../../features/auth/authSlice';
import LoadingState from '../../components/LoadingState';

const STATUS_STYLES = {
  active: { color: 'success', label: 'Active' },
  trial: { color: 'info', label: 'Trial' },
  suspended: { color: 'error', label: 'Suspended' },
  expired: { color: 'warning', label: 'Expired' },
};

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).replace(',', ' •');
}

function StatusBadge({ status }) {
  const theme = useTheme();
  const cfg = STATUS_STYLES[status] || { color: 'default', label: status };
  const palette = theme.palette[cfg.color]?.main || theme.palette.text.secondary;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 0.75,
        borderRadius: 999,
        bgcolor: alpha(palette, 0.12),
        border: '1px solid',
        borderColor: alpha(palette, 0.35),
      }}
    >
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: palette }} />
      <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize', color: palette }}>
        {cfg.label}
      </Typography>
    </Box>
  );
}

function SectionCard({ icon, title, subtitle, children }) {
  return (
    <Card
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
              color: 'primary.main',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>{title}</Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
            )}
          </Box>
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

function DetailRow({ icon, label, value, valueNode }) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 1.5 }}>
      <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', minWidth: 24 }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
        {valueNode || (
          <Typography fontWeight={600} noWrap title={typeof value === 'string' ? value : undefined}>
            {value || '—'}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

function SubscriptionBadge({ status }) {
  const theme = useTheme();
  const normalized = (status || 'unknown').toLowerCase();
  const color = normalized === 'active' || normalized === 'trialing' ? theme.palette.success.main : theme.palette.text.secondary;

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        px: 1.5,
        py: 0.25,
        borderRadius: 999,
        bgcolor: alpha(color, 0.12),
        color,
        fontSize: 13,
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
    >
      {status || '—'}
    </Box>
  );
}

export default function BusinessDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const [selectedPlan, setSelectedPlan] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: business, isLoading } = useQuery({
    queryKey: ['business', id],
    queryFn: () => api.get(`/businesses/${id}`).then((r) => r.data.data),
  });

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then((r) => r.data.data),
  });

  const action = useMutation({
    mutationFn: ({ url, method = 'post', body }) => api[method](url, body),
    onSuccess: () => {
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
      localStorage.setItem('tenantSlug', business?.slug);
      navigate('/dashboard');
    },
  });

  const copyEmail = async () => {
    const email = business?.owner_email || business?.email;
    if (!email) return;
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <LoadingState message="Loading business…" />;
  if (!business) return <Typography>Business not found</Typography>;

  const ownerEmail = business.owner_email || business.email;
  const subdomain = business.domains?.[0]?.domain || `${business.slug}.eyz.com`;
  const planName = business.subscription?.plan_name || '—';
  const subStatus = business.subscription?.status;

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/admin/businesses')}
        sx={{ mb: 3, color: 'primary.main', fontWeight: 600, px: 0 }}
      >
        Back to Businesses
      </Button>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Stack direction="row" spacing={2.5} alignItems="center">
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.success.main, 0.15),
              color: 'success.main',
              flexShrink: 0,
            }}
          >
            <Store sx={{ fontSize: 36 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800} lineHeight={1.2}>
              {business.name}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography color="text.secondary">{ownerEmail}</Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy email'}>
                <IconButton size="small" onClick={copyEmail} sx={{ color: 'text.secondary' }}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </Stack>
        <StatusBadge status={business.status} />
      </Stack>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <SectionCard
            icon={<InfoOutlined />}
            title="Details"
            subtitle="View tenant and subscription information."
          >
            <DetailRow icon={<LocalOffer fontSize="small" />} label="Slug" value={business.slug} />
            <DetailRow icon={<Phone fontSize="small" />} label="Phone" value={business.phone || '—'} />
            <DetailRow icon={<Language fontSize="small" />} label="Subdomain" value={subdomain} />
            <DetailRow icon={<WorkspacePremium fontSize="small" />} label="Plan" value={planName} />
            <DetailRow
              icon={<CreditCard fontSize="small" />}
              label="Subscription"
              valueNode={<SubscriptionBadge status={subStatus} />}
            />
            <DetailRow
              icon={<CalendarToday fontSize="small" />}
              label="Created At"
              value={formatDateTime(business.created_at)}
            />
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={5}>
          <SectionCard
            icon={<BoltOutlined />}
            title="Actions"
            subtitle="Manage tenant account and subscription."
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
              {business.status === 'suspended' ? (
                <Button
                  fullWidth
                  variant="outlined"
                  color="success"
                  startIcon={<PauseCircleOutline />}
                  onClick={() => action.mutate({ url: `/businesses/${id}/activate` })}
                  disabled={action.isPending}
                >
                  Activate
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<PauseCircleOutline />}
                  onClick={() => action.mutate({ url: `/businesses/${id}/suspend` })}
                  disabled={action.isPending}
                >
                  Suspend
                </Button>
              )}
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                startIcon={<Schedule />}
                onClick={() => action.mutate({ url: `/businesses/${id}/extend-trial`, body: { days: 14 } })}
                disabled={action.isPending}
              >
                Extend Trial
              </Button>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Login />}
                onClick={() => impersonate.mutate()}
                disabled={impersonate.isPending}
              >
                Login As Tenant
              </Button>
            </Stack>

            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Upgrade Plan</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Change the subscription plan for this tenant.
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              displayEmpty
              sx={{ mb: 2 }}
            >
              <MenuItem value="" disabled>Select a plan</MenuItem>
              {(plans || []).map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name} — ${Number(p.monthly_price).toFixed(0)}/mo
                </MenuItem>
              ))}
            </TextField>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Upgrade />}
              disabled={!selectedPlan || action.isPending}
              onClick={() => action.mutate({
                url: `/businesses/${id}/upgrade-plan`,
                body: { plan_id: selectedPlan, billing_cycle: 'monthly' },
              })}
            >
              Upgrade Plan
            </Button>
          </SectionCard>
        </Grid>
      </Grid>

      <Card
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={2}
          >
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                  flexShrink: 0,
                }}
              >
                <ShieldOutlined />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Secure &amp; Trusted</Typography>
                <Typography variant="body2" color="text.secondary">
                  All actions are logged and your data is protected with enterprise-grade security.
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="outlined"
              startIcon={<DescriptionOutlined />}
              onClick={() => navigate(`/admin/audit-logs?tenant_id=${id}`)}
              sx={{ flexShrink: 0 }}
            >
              View Audit Logs
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
