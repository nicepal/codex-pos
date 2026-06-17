import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Typography, Grid, LinearProgress, Button, IconButton, Chip,
  Alert, TextField, Stack,
} from '@mui/material';
import { Add, Delete, ContentCopy } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';
import RHFTextField from '../../components/RHFTextField';

function UsageBar({ label, used, limit, unit }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'primary';
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" color="text.secondary">
          {used}{unit} {limit == null ? '/ Unlimited' : `/ ${limit}${unit}`}
        </Typography>
      </Box>
      <LinearProgress variant="determinate" value={limit == null ? 0 : pct} color={color} sx={{ height: 8, borderRadius: 4 }} />
    </Box>
  );
}

export default function DevelopersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [revokeId, setRevokeId] = useState(null);
  const [newKey, setNewKey] = useState(null);
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, reset } = useForm({ defaultValues: { name: '', scopes: 'read' } });

  const { data: usage } = useQuery({
    queryKey: ['usage'],
    queryFn: () => api.get('/usage').then((r) => r.data.data),
  });

  const { data: keysData, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get('/api-keys').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/api-keys', payload).then((r) => r.data.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['api-keys']);
      setOpen(false);
      reset();
      setNewKey(data.api_key);
    },
    onError: (err) => setFormError(err.response?.data?.message || 'Failed to create key'),
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => api.delete(`/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['api-keys']);
      setRevokeId(null);
    },
  });

  const onSubmit = (values) => {
    setFormError('');
    createMutation.mutate({
      name: values.name,
      scopes: values.scopes === 'write' ? ['read', 'write'] : ['read'],
    });
  };

  const columns = [
    { field: 'name', label: 'Name' },
    { field: 'masked_key', label: 'Key' },
    { field: 'scopes', label: 'Scopes', render: (r) => (r.scopes || []).join(', ') },
    {
      field: 'status',
      label: 'Status',
      render: (r) => <Chip size="small" label={r.status} color={r.status === 'active' ? 'success' : 'default'} />,
    },
    { field: 'last_used_at', label: 'Last used', render: (r) => (r.last_used_at ? new Date(r.last_used_at).toLocaleString() : 'Never') },
    {
      field: 'actions',
      label: '',
      render: (r) => (r.status === 'active' ? (
        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setRevokeId(r.id); }}>
          <Delete fontSize="small" />
        </IconButton>
      ) : null),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Developers"
        subtitle="Monitor plan usage and manage API keys for the public API"
        actionLabel="Create API Key"
        actionIcon={<Add />}
        onAction={() => { setFormError(''); setOpen(true); }}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Plan Usage</Typography>
              {usage ? (
                <>
                  <UsageBar label="Products" used={usage.products.used} limit={usage.products.limit} unit="" />
                  <UsageBar label="Team members" used={usage.users.used} limit={usage.users.limit} unit="" />
                  <UsageBar label="Branches" used={usage.branches.used} limit={usage.branches.limit} unit="" />
                  <UsageBar label="Transactions (this period)" used={usage.transactions.used} limit={usage.transactions.limit} unit="" />
                  <UsageBar label="Storage" used={usage.storage_mb.used} limit={usage.storage_mb.limit} unit=" MB" />
                </>
              ) : <LinearProgress />}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Public API</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Authenticate with the <code>X-API-Key</code> header against:
              </Typography>
              <Box component="pre" sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1, fontSize: 13, overflowX: 'auto' }}>
{`GET /api/v1/public/v1/products
GET /api/v1/public/v1/orders
POST /api/v1/public/v1/orders
GET /api/v1/public/v1/customers`}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {newKey && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNewKey(null)}>
          <Typography variant="body2" sx={{ mb: 1 }}>Copy your new API key now — it will not be shown again:</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField size="small" value={newKey} fullWidth InputProps={{ readOnly: true }} />
            <IconButton onClick={() => navigator.clipboard?.writeText(newKey)}><ContentCopy /></IconButton>
          </Stack>
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>API Keys</Typography>
      <DataTable
        columns={columns}
        rows={keysData || []}
        loading={isLoading}
        emptyTitle="No API keys"
        emptyMessage="Create an API key to integrate external apps with your store."
        onEmptyAction={() => setOpen(true)}
        emptyActionLabel="Create API Key"
      />

      <FormDialog
        open={open}
        title="Create API Key"
        onClose={() => { setOpen(false); setFormError(''); }}
        onSubmit={handleSubmit(onSubmit)}
        loading={createMutation.isPending}
        submitLabel="Create"
        error={formError}
      >
        <Grid item xs={12}>
          <RHFTextField register={register} name="name" rules={{ required: 'Name is required' }} label="Key name" />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth select SelectProps={{ native: true }} label="Scopes" {...register('scopes')}>
            <option value="read">Read only</option>
            <option value="write">Read &amp; write</option>
          </TextField>
        </Grid>
      </FormDialog>

      <ConfirmDialog
        open={!!revokeId}
        title="Revoke API Key"
        message="Revoke this key? Any integration using it will stop working immediately."
        onConfirm={() => revokeMutation.mutate(revokeId)}
        onCancel={() => setRevokeId(null)}
        loading={revokeMutation.isPending}
        danger
        confirmLabel="Revoke"
      />
    </Box>
  );
}
