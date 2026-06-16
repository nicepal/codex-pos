import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Grid, TextField, MenuItem } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import RHFTextField from '../../components/RHFTextField';

export default function CouponsPage() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => api.get('/coupons').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/coupons', payload),
    onSuccess: () => { queryClient.invalidateQueries(['coupons']); setOpen(false); reset(); },
  });

  const columns = [
    { field: 'code', label: 'Code' },
    { field: 'discount_type', label: 'Type' },
    { field: 'discount_value', label: 'Value', render: (r) => r.discount_type === 'percentage' ? `${r.discount_value}%` : `$${r.discount_value}` },
    { field: 'status', label: 'Status' },
    { field: 'created_at', label: 'Created', render: (r) => new Date(r.created_at).toLocaleDateString() },
  ];

  return (
    <>
      <PageHeader title="Coupons" actionLabel="Create Coupon" actionIcon={<Add />} onAction={() => setOpen(true)} />
      <DataTable columns={columns} rows={data?.data || []} loading={isLoading} emptyTitle="No coupons" emptyActionLabel="Create Coupon" onEmptyAction={() => setOpen(true)} />
      <FormDialog open={open} title="Create Coupon" onClose={() => setOpen(false)} onSubmit={handleSubmit((d) => createMutation.mutate({ ...d, discount_value: parseFloat(d.discount_value) }))} loading={createMutation.isPending}>
        <Grid item xs={12}><RHFTextField register={register} name="code" rules={{ required: true }} label="Code" /></Grid>
        <Grid item xs={12}>
          <TextField fullWidth select label="Discount Type" defaultValue="percentage" {...register('discount_type')}>
            <MenuItem value="percentage">Percentage</MenuItem>
            <MenuItem value="fixed">Fixed Amount</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12}><RHFTextField register={register} name="discount_value" rules={{ required: true }} label="Discount Value" type="number" /></Grid>
      </FormDialog>
    </>
  );
}
