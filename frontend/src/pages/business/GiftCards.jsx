import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Grid, TextField, IconButton, Chip, Alert, Box,
} from '@mui/material';
import { Add, Block } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';
import RHFTextField from '../../components/RHFTextField';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import { formatDisplayText } from '../../utils/displayText';

const defaultValues = {
  amount: 50,
  code: '',
  currency: 'USD',
  expires_at: '',
};

export default function GiftCardsPage() {
  const { formatMoney } = useBusinessCurrency();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [disableId, setDisableId] = useState(null);
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['gift-cards'],
    queryFn: () => api.get('/gift-cards', { params: { limit: 100 } }).then((r) => r.data),
  });

  const rows = data?.data || [];

  const openForm = () => {
    setFormError('');
    reset(defaultValues);
    setOpen(true);
  };

  const issueMutation = useMutation({
    mutationFn: (payload) => api.post('/gift-cards', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['gift-cards']);
      setOpen(false);
      reset(defaultValues);
    },
    onError: (err) => setFormError(err.response?.data?.message || 'Failed to issue gift card'),
  });

  const disableMutation = useMutation({
    mutationFn: (id) => api.delete(`/gift-cards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['gift-cards']);
      setDisableId(null);
    },
  });

  const onSubmit = (values) => {
    const amount = parseFloat(values.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter a valid amount greater than zero');
      return;
    }
    issueMutation.mutate({
      amount,
      code: values.code?.trim() || undefined,
      currency: values.currency || 'USD',
      expires_at: values.expires_at || null,
    });
  };

  const columns = [
    { field: 'code', label: 'Code', render: (r) => <strong>{r.code}</strong> },
    { field: 'initial_balance', label: 'Issued', render: (r) => formatMoney(r.initial_balance) },
    { field: 'balance', label: 'Balance', render: (r) => formatMoney(r.balance) },
    { field: 'customer_name', label: 'Customer', render: (r) => r.customer_name || '—' },
    { field: 'expires_at', label: 'Expires', render: (r) => (r.expires_at ? new Date(r.expires_at).toLocaleDateString() : '—') },
    {
      field: 'status',
      label: 'Status',
      render: (r) => (
        <Chip
          label={formatDisplayText(r.status)}
          size="small"
          color={r.status === 'active' ? 'success' : r.status === 'redeemed' ? 'default' : 'warning'}
        />
      ),
    },
    {
      field: 'actions',
      label: 'Actions',
      render: (r) => (
        r.status === 'active' ? (
          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDisableId(r.id); }}>
            <Block fontSize="small" />
          </IconButton>
        ) : null
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Gift Cards"
        subtitle="Issue and manage gift cards / store credit redeemable at POS and online"
        actionLabel="Issue Gift Card"
        actionIcon={<Add />}
        onAction={openForm}
      />

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.response?.data?.message || 'Could not load gift cards.'}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        emptyTitle="No gift cards yet"
        emptyMessage="Issue your first gift card to let customers pre-pay or receive store credit."
        onEmptyAction={openForm}
        emptyActionLabel="Issue Gift Card"
      />

      <FormDialog
        open={open}
        title="Issue Gift Card"
        onClose={() => { setOpen(false); setFormError(''); }}
        onSubmit={handleSubmit(onSubmit)}
        loading={issueMutation.isPending}
        submitLabel="Issue"
        error={formError}
      >
        <Grid item xs={12} sm={6}>
          <RHFTextField
            register={register}
            name="amount"
            rules={{ required: 'Amount is required', min: { value: 0.01, message: 'Must be greater than zero' } }}
            label="Amount"
            type="number"
            inputProps={{ step: 0.01, min: 0.01 }}
            error={!!errors.amount}
            helperText={errors.amount?.message}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFTextField register={register} name="currency" label="Currency" />
        </Grid>
        <Grid item xs={12}>
          <RHFTextField register={register} name="code" label="Custom code (optional)" helperText="Leave blank to auto-generate" />
        </Grid>
        <Grid item xs={12}>
          <RHFTextField register={register} name="expires_at" label="Expires on (optional)" type="date" InputLabelProps={{ shrink: true }} />
        </Grid>
      </FormDialog>

      <ConfirmDialog
        open={!!disableId}
        title="Deactivate Gift Card"
        message="Deactivate this gift card? Its remaining balance will no longer be redeemable."
        onConfirm={() => disableMutation.mutate(disableId)}
        onCancel={() => setDisableId(null)}
        loading={disableMutation.isPending}
        danger
        confirmLabel="Deactivate"
      />
    </Box>
  );
}
