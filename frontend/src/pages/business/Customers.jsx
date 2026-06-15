import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Grid, TextField } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import { emptyPresetProps } from '../../utils/emptyStatePresets';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';

const empty = emptyPresetProps('customers');

export default function CustomersPage() {
  const { formatMoney } = useBusinessCurrency();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/customers', payload),
    onSuccess: () => { queryClient.invalidateQueries(['customers']); setOpen(false); reset(); },
  });

  const rows = data?.data || [];

  const columns = [
    { field: 'name', label: 'Name' },
    { field: 'email', label: 'Email', render: (r) => r.email || '-' },
    { field: 'phone', label: 'Phone', render: (r) => r.phone || '-' },
    { field: 'loyalty_points', label: 'Loyalty Points' },
    { field: 'credit_balance', label: 'Credit Balance', render: (r) => formatMoney(r.credit_balance) },
  ];

  return (
    <>
      <PageHeader title="Customers" subtitle="Manage customer profiles and loyalty" actionLabel="Add Customer" actionIcon={<Add />} onAction={() => setOpen(true)} />
      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        onRowClick={(r) => navigate(`/customers/${r.id}`)}
        onEmptyAction={() => setOpen(true)}
        emptyActionIcon={<Add />}
        {...empty}
      />

      <FormDialog
        open={open}
        title="Add Customer"
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit((d) => createMutation.mutate(d))}
        loading={createMutation.isPending}
        submitLabel="Add"
      >
        <Grid item xs={12}><TextField fullWidth label="Name" {...register('name', { required: true })} /></Grid>
        <Grid item xs={12}><TextField fullWidth label="Email" type="email" {...register('email')} /></Grid>
        <Grid item xs={12}><TextField fullWidth label="Phone" {...register('phone')} /></Grid>
        <Grid item xs={12}><TextField fullWidth label="Address" {...register('address')} /></Grid>
      </FormDialog>
    </>
  );
}
