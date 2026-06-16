import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Chip } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { Grid, TextField, MenuItem } from '@mui/material';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import RHFTextField from '../../components/RHFTextField';
import { emptyPresetProps } from '../../utils/emptyStatePresets';

const empty = emptyPresetProps('support');

const priorityColors = { low: 'default', medium: 'info', high: 'warning', critical: 'error' };

export default function SupportPage() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['business-tickets'],
    queryFn: () => api.get('/tickets').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/tickets', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['business-tickets']);
      setOpen(false);
      reset();
    },
  });

  const columns = [
    { field: 'ticket_number', label: 'Ticket #' },
    { field: 'subject', label: 'Subject' },
    { field: 'priority', label: 'Priority', render: (r) => <Chip label={r.priority} size="small" color={priorityColors[r.priority]} /> },
    { field: 'status', label: 'Status', render: (r) => <Chip label={r.status} size="small" /> },
    { field: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString() },
  ];

  return (
    <>
      <PageHeader title="Support" subtitle="Get help from the EYZ POS team" actionLabel="New Ticket" actionIcon={<Add />} onAction={() => setOpen(true)} />
      <DataTable
        columns={columns}
        rows={data?.data || []}
        loading={isLoading}
        onEmptyAction={() => setOpen(true)}
        emptyActionIcon={<Add />}
        {...empty}
        onRowClick={(row) => navigate(`/support/${row.id}`)}
      />

      <FormDialog
        open={open}
        title="New Support Ticket"
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit((d) => createMutation.mutate(d))}
        loading={createMutation.isPending}
        submitLabel="Submit"
      >
        <Grid item xs={12}><RHFTextField register={register} name="subject" rules={{ required: true }} label="Subject" /></Grid>
        <Grid item xs={12}>
          <TextField fullWidth select label="Priority" defaultValue="medium" {...register('priority')}>
            {['low', 'medium', 'high', 'critical'].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth select label="Category" defaultValue="general" {...register('category')}>
            {['general', 'billing', 'technical', 'inventory'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12}><RHFTextField register={register} name="description" rules={{ required: true }} label="Description" multiline rows={4} /></Grid>
      </FormDialog>
    </>
  );
}
