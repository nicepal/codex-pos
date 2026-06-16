import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, TextField, MenuItem, Grid, Alert,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import useTenantFeatures from '../../hooks/useTenantFeatures';
import { emptyPresetProps } from '../../utils/emptyStatePresets';

const empty = emptyPresetProps('inventory');

export default function TransfersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasFeature } = useTenantFeatures();
  const inventoryPro = hasFeature('inventory_pro');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    from_branch_id: '',
    to_branch_id: '',
    notes: '',
    items: [{ product_id: '', quantity: 1 }],
  });
  const [error, setError] = useState('');

  const { data, isLoading, isError, error: fetchError, refetch } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => api.get('/transfers').then((r) => r.data),
    enabled: inventoryPro,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches', { params: { limit: 200 } }).then((r) => r.data.data),
    enabled: inventoryPro,
  });

  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => api.get('/products', { params: { limit: 200 } }).then((r) => r.data.data),
    enabled: inventoryPro,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/transfers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['transfers']);
      setOpen(false);
      setError('');
      setForm({ from_branch_id: '', to_branch_id: '', notes: '', items: [{ product_id: '', quantity: 1 }] });
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to create transfer'),
  });

  const completeMutation = useMutation({
    mutationFn: (id) => api.post(`/transfers/${id}/complete`),
    onSuccess: () => queryClient.invalidateQueries(['transfers']),
    onError: (err) => setError(err.response?.data?.message || 'Failed to complete transfer'),
  });

  const columns = [
    { field: 'transfer_number', label: 'Transfer #' },
    { field: 'from_branch_name', label: 'From' },
    { field: 'to_branch_name', label: 'To' },
    { field: 'status', label: 'Status' },
    {
      field: 'actions',
      label: '',
      render: (r) => r.status !== 'completed' && (
        <Button size="small" onClick={() => completeMutation.mutate(r.id)} disabled={completeMutation.isPending}>
          Complete
        </Button>
      ),
    },
  ];

  const save = (e) => {
    e.preventDefault();
    const items = form.items.filter((i) => i.product_id && i.quantity > 0);
    if (!form.from_branch_id || !form.to_branch_id) {
      setError('Select both branches');
      return;
    }
    if (form.from_branch_id === form.to_branch_id) {
      setError('From and to branches must be different');
      return;
    }
    if (!items.length) {
      setError('Select at least one product');
      return;
    }
    if (branches?.length < 2) {
      setError('You need at least two branches to transfer stock');
      return;
    }
    createMutation.mutate({ ...form, items });
  };

  if (!inventoryPro) {
    return (
      <Box>
        <PageHeader title="Stock Transfers" subtitle="Move inventory between branches" />
        <Alert severity="info" sx={{ mb: 2 }}>
          Stock transfers require the <strong>Inventory Pro</strong> feature pack.
        </Alert>
        <Button variant="contained" onClick={() => navigate('/settings')}>Enable in Settings</Button>
        <Button sx={{ ml: 1 }} variant="outlined" onClick={() => navigate('/subscription')}>View plans</Button>
      </Box>
    );
  }

  const apiMessage = fetchError?.response?.data?.message;

  return (
    <Box>
      <PageHeader
        title="Stock Transfers"
        subtitle="Move inventory between branches"
        actionLabel="New Transfer"
        actionIcon={<Add />}
        onAction={() => { setError(''); setOpen(true); }}
      />

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }} action={(
          <Button color="inherit" size="small" onClick={() => refetch()}>Retry</Button>
        )}>
          {apiMessage || 'Could not load transfers'}
        </Alert>
      )}

      {error && !open && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}

      {(branches?.length ?? 0) < 2 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Add at least two branches before creating transfers.{' '}
          <Button size="small" onClick={() => navigate('/branches')}>Manage branches</Button>
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={data?.data || []}
        loading={isLoading}
        onEmptyAction={() => setOpen(true)}
        emptyActionIcon={<Add />}
        {...empty}
      />

      <FormDialog
        open={open}
        onClose={() => { setOpen(false); setError(''); }}
        title="New Transfer"
        onSubmit={save}
        loading={createMutation.isPending}
        error={error}
        submitLabel="Create transfer"
      >
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            required
            label="From branch"
            value={form.from_branch_id}
            onChange={(e) => setForm({ ...form, from_branch_id: e.target.value })}
          >
            {(branches || []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            required
            label="To branch"
            value={form.to_branch_id}
            onChange={(e) => setForm({ ...form, to_branch_id: e.target.value })}
          >
            {(branches || []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <TextField
            select
            fullWidth
            required
            label="Product"
            value={form.items[0].product_id}
            onChange={(e) => setForm({ ...form, items: [{ ...form.items[0], product_id: e.target.value }] })}
          >
            {(products || []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            type="number"
            label="Quantity"
            inputProps={{ min: 1 }}
            value={form.items[0].quantity}
            onChange={(e) => setForm({
              ...form,
              items: [{ ...form.items[0], quantity: parseInt(e.target.value, 10) || 1 }],
            })}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Grid>
      </FormDialog>
    </Box>
  );
}
