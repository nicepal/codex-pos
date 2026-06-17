import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Grid, TextField, Chip, Button, Box, IconButton, MenuItem, Stack,
} from '@mui/material';
import { Add, Visibility, CheckCircle, Cancel } from '@mui/icons-material';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import api from '../../services/api';
import { formatMoney } from '../../utils/currency';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import RHFTextField from '../../components/RHFTextField';
import RHFControllerField from '../../components/RHFControllerField';
import StatCard from '../../components/StatCard';
import { formatDisplayText } from '../../utils/displayText';

const STATUS_COLORS = {
  pending: 'warning',
  paid: 'success',
  failed: 'error',
  refunded: 'info',
  cancelled: 'default',
};

export default function BillingPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, control } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['billing-invoices', statusFilter],
    queryFn: () => api.get('/billing', {
      params: { status: statusFilter || undefined, limit: 100 },
    }).then((r) => r.data),
  });

  const { data: businesses } = useQuery({
    queryKey: ['businesses-billing'],
    queryFn: () => api.get('/businesses', { params: { limit: 200 } }).then((r) => r.data.data),
  });

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/billing', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['billing-invoices']);
      setOpen(false);
      reset();
      const id = res.data?.data?.id;
      if (id) navigate(`/admin/billing/${id}`);
    },
  });

  const markPaid = useMutation({
    mutationFn: (id) => api.post(`/billing/${id}/mark-paid`, { payment_method: 'manual' }),
    onSuccess: () => queryClient.invalidateQueries(['billing-invoices']),
  });

  const cancelInvoice = useMutation({
    mutationFn: (id) => api.post(`/billing/${id}/cancel`),
    onSuccess: () => queryClient.invalidateQueries(['billing-invoices']),
  });

  const rows = data?.data || [];
  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const paidTotal = rows.filter((r) => r.status === 'paid').reduce((s, r) => s + Number(r.total || 0), 0);

  const columns = [
    { field: 'invoice_number', label: 'Invoice #' },
    { field: 'tenant_name', label: 'Tenant', render: (r) => r.tenant_name || '—' },
    { field: 'plan_name', label: 'Plan', render: (r) => r.plan_name || '—' },
    {
      field: 'total',
      label: 'Amount',
      align: 'right',
      render: (r) => formatMoney(r.total, r.currency),
    },
    {
      field: 'status',
      label: 'Status',
      render: (r) => (
        <Chip label={formatDisplayText(r.status)} size="small" color={STATUS_COLORS[r.status] || 'default'} />
      ),
    },
    { field: 'due_date', label: 'Due', render: (r) => r.due_date ? new Date(r.due_date).toLocaleDateString() : '—' },
    { field: 'created_at', label: 'Created', render: (r) => new Date(r.created_at).toLocaleDateString() },
    {
      field: 'actions',
      label: 'Actions',
      render: (r) => (
        <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
          <IconButton size="small" title="View details" onClick={() => navigate(`/admin/billing/${r.id}`)}>
            <Visibility fontSize="small" />
          </IconButton>
          {(r.status === 'pending' || r.status === 'failed') && (
            <>
              <IconButton size="small" color="success" title="Mark paid" onClick={() => markPaid.mutate(r.id)}>
                <CheckCircle fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" title="Cancel" onClick={() => cancelInvoice.mutate(r.id)}>
                <Cancel fontSize="small" />
              </IconButton>
            </>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Billing & Invoices"
        subtitle="Platform billing and invoice management"
        actionLabel="Create Invoice"
        actionIcon={<Add />}
        onAction={() => setOpen(true)}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard title="Total Invoices" value={rows.length} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard title="Pending" value={pendingCount} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard title="Paid (this page)" value={formatMoney(paidTotal)} />
        </Grid>
      </Grid>

      <Box sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {['pending', 'paid', 'failed', 'refunded', 'cancelled'].map((s) => (
            <MenuItem key={s} value={s}>{formatDisplayText(s)}</MenuItem>
          ))}
        </TextField>
      </Box>

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        onRowClick={(r) => navigate(`/admin/billing/${r.id}`)}
        emptyTitle="No invoices"
        emptyMessage="Create an invoice for a tenant to start tracking platform billing."
        emptyActionLabel="Create Invoice"
        onEmptyAction={() => setOpen(true)}
      />

      <FormDialog
        open={open}
        title="Create Invoice"
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit((d) => createMutation.mutate({
          tenant_id: d.tenant_id,
          plan_id: d.plan_id || undefined,
          amount: parseFloat(d.amount),
          tax: parseFloat(d.tax || 0),
          discount: parseFloat(d.discount || 0),
          currency: d.currency || 'USD',
          due_date: d.due_date || undefined,
          notes: d.notes || undefined,
        }))}
        loading={createMutation.isPending}
        submitLabel="Create"
        maxWidth="sm"
      >
        <Grid item xs={12}>
          <Controller
            name="tenant_id"
            control={control}
            rules={{ required: true }}
            defaultValue=""
            render={({ field, fieldState }) => (
              <RHFControllerField field={field} fieldState={fieldState} rules={{ required: true }} select label="Tenant">
                <MenuItem value="" disabled>Select tenant</MenuItem>
                {(businesses || []).map((b) => (
                  <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                ))}
              </RHFControllerField>
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="plan_id"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <TextField {...field} select fullWidth label="Plan (optional)">
                <MenuItem value="">None</MenuItem>
                {(plans || []).map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFTextField register={register} name="amount" rules={{ required: true }} label="Amount" type="number" inputProps={{ step: '0.01' }} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            name="currency"
            control={control}
            defaultValue="USD"
            render={({ field }) => (
              <TextField {...field} select fullWidth label="Currency">
                {['USD', 'EUR', 'GBP', 'PKR', 'AED', 'SAR'].map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField fullWidth label="Tax" type="number" inputProps={{ step: '0.01' }} {...register('tax')} />
        </Grid>
        <Grid item xs={6}>
          <TextField fullWidth label="Discount" type="number" inputProps={{ step: '0.01' }} {...register('discount')} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Due Date" type="date" InputLabelProps={{ shrink: true }} {...register('due_date')} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Notes" multiline rows={2} {...register('notes')} />
        </Grid>
      </FormDialog>
    </>
  );
}
