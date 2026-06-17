import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Grid, TextField, MenuItem, IconButton, Chip, Alert, Box,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';
import RHFTextField from '../../components/RHFTextField';
import FeatureGate from '../../components/FeatureGate';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import { emptyPresetProps } from '../../utils/emptyStatePresets';
import { formatDisplayText } from '../../utils/displayText';

const empty = emptyPresetProps('coupons');

const defaultValues = {
  code: '',
  discount_type: 'percent',
  discount_value: 10,
  min_order_amount: '',
  max_uses: '',
  starts_at: '',
  expires_at: '',
  status: 'active',
};

function formatDiscount(coupon, formatMoney) {
  if (coupon.discount_type === 'percent') return `${coupon.discount_value}%`;
  return formatMoney(coupon.discount_value);
}

export default function TenantCouponsPage() {
  const { formatMoney } = useBusinessCurrency();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({ defaultValues });
  const discountType = watch('discount_type');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tenant-coupons'],
    queryFn: () => api.get('/tenant-coupons', { params: { limit: 100 } }).then((r) => r.data),
  });

  const rows = data?.data || [];

  const openForm = (coupon = null) => {
    setFormError('');
    setEditing(coupon);
    reset(coupon ? {
      code: coupon.code || '',
      discount_type: coupon.discount_type || 'percent',
      discount_value: coupon.discount_value ?? 10,
      min_order_amount: coupon.min_order_amount ?? '',
      max_uses: coupon.max_uses ?? '',
      starts_at: coupon.starts_at ? coupon.starts_at.slice(0, 10) : '',
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : '',
      status: coupon.status || 'active',
    } : defaultValues);
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => (editing
      ? api.put(`/tenant-coupons/${editing.id}`, payload)
      : api.post('/tenant-coupons', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries(['tenant-coupons']);
      setOpen(false);
      setEditing(null);
      setFormError('');
      reset(defaultValues);
    },
    onError: (err) => {
      setFormError(err.response?.data?.message || 'Failed to save coupon');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/tenant-coupons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['tenant-coupons']);
      setDeleteId(null);
    },
  });

  const onSubmit = (values) => {
    const payload = {
      code: values.code.trim().toUpperCase(),
      discount_type: values.discount_type,
      discount_value: parseFloat(values.discount_value),
      status: values.status || 'active',
      min_order_amount: values.min_order_amount !== '' ? parseFloat(values.min_order_amount) : 0,
      max_uses: values.max_uses !== '' ? parseInt(values.max_uses, 10) : null,
      starts_at: values.starts_at || null,
      expires_at: values.expires_at || null,
    };

    if (!payload.code) {
      setFormError('Coupon code is required');
      return;
    }
    if (!Number.isFinite(payload.discount_value) || payload.discount_value <= 0) {
      setFormError('Enter a valid discount value greater than zero');
      return;
    }

    saveMutation.mutate(payload);
  };

  const columns = [
    { field: 'code', label: 'Code', render: (r) => <strong>{r.code}</strong> },
    {
      field: 'discount',
      label: 'Discount',
      render: (r) => formatDiscount(r, formatMoney),
    },
    {
      field: 'min_order_amount',
      label: 'Min order',
      render: (r) => (parseFloat(r.min_order_amount) > 0 ? formatMoney(r.min_order_amount) : '—'),
    },
    {
      field: 'usage',
      label: 'Usage',
      render: (r) => (r.max_uses ? `${r.used_count || 0} / ${r.max_uses}` : `${r.used_count || 0}`),
    },
    {
      field: 'expires_at',
      label: 'Expires',
      render: (r) => (r.expires_at ? new Date(r.expires_at).toLocaleDateString() : '—'),
    },
    {
      field: 'status',
      label: 'Status',
      render: (r) => (
        <Chip
          label={formatDisplayText(r.status)}
          size="small"
          color={r.status === 'active' ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'actions',
      label: 'Actions',
      render: (r) => (
        <>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); openForm(r); }}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}>
            <Delete fontSize="small" />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <FeatureGate pack="catalog_pro">
      <Box>
        <PageHeader
          title="Coupons"
          subtitle="Discount codes for POS and storefront checkout"
          actionLabel="Create Coupon"
          actionIcon={<Add />}
          onAction={() => openForm()}
        />

        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error?.response?.data?.message || 'Could not load coupons. Enable Catalog Pro in Settings if needed.'}
          </Alert>
        )}

        <DataTable
          columns={columns}
          rows={rows}
          loading={isLoading}
          onEmptyAction={() => openForm()}
          {...empty}
        />

        <FormDialog
          key={editing?.id || 'create'}
          open={open}
          title={editing ? 'Edit Coupon' : 'Create Coupon'}
          onClose={() => { setOpen(false); setEditing(null); setFormError(''); }}
          onSubmit={handleSubmit(onSubmit)}
          loading={saveMutation.isPending}
          submitLabel={editing ? 'Update' : 'Create'}
          error={formError}
        >
          <Grid item xs={12}>
            <RHFTextField
              register={register}
              name="code"
              rules={{ required: 'Code is required' }}
              label="Coupon code"
              inputProps={{ style: { textTransform: 'uppercase' } }}
              error={!!errors.code}
              helperText={errors.code?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth select label="Discount type" defaultValue="percent" {...register('discount_type')}>
              <MenuItem value="percent">Percentage off</MenuItem>
              <MenuItem value="fixed">Fixed amount off</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <RHFTextField
              register={register}
              name="discount_value"
              rules={{ required: 'Value is required', min: { value: 0.01, message: 'Must be greater than zero' } }}
              label={discountType === 'percent' ? 'Percent off' : 'Amount off'}
              type="number"
              inputProps={{ step: discountType === 'percent' ? 1 : 0.01, min: 0.01 }}
              error={!!errors.discount_value}
              helperText={errors.discount_value?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <RHFTextField register={register} name="min_order_amount" label="Minimum order (optional)" type="number" inputProps={{ min: 0, step: 0.01 }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <RHFTextField register={register} name="max_uses" label="Max uses (optional)" type="number" inputProps={{ min: 1, step: 1 }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <RHFTextField register={register} name="starts_at" label="Starts on (optional)" type="date" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <RHFTextField register={register} name="expires_at" label="Expires on (optional)" type="date" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth select label="Status" defaultValue="active" {...register('status')}>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Grid>
        </FormDialog>

        <ConfirmDialog
          open={!!deleteId}
          title="Delete Coupon"
          message="Delete this coupon? It will no longer work at checkout."
          onConfirm={() => deleteMutation.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
          loading={deleteMutation.isPending}
          danger
          confirmLabel="Delete"
        />
      </Box>
    </FeatureGate>
  );
}
