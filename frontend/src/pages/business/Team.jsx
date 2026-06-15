import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Grid, TextField, MenuItem, IconButton, Chip, Alert } from '@mui/material';
import { PersonAdd, Delete } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';
import BulkDeleteActions from '../../components/BulkDeleteActions';
import useBulkDelete from '../../hooks/useBulkDelete';
import { emptyPresetProps } from '../../utils/emptyStatePresets';

const empty = emptyPresetProps('team');

const ROLES = ['manager', 'cashier'];

export default function TeamPage() {
  const [open, setOpen] = useState(false);
  const [removeId, setRemoveId] = useState(null);
  const [limitError, setLimitError] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.get('/team').then((r) => r.data.data),
  });

  const inviteMutation = useMutation({
    mutationFn: (payload) => api.post('/team/invite', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['team']);
      setOpen(false);
      reset();
      if (res.data?.data?.temp_password) setLimitError(`Invited! Temp password: ${res.data.data.temp_password}`);
    },
    onError: (err) => {
      if (err.response?.status === 403) navigate('/subscription');
      else setLimitError(err.response?.data?.message || 'Invite failed');
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => api.put(`/team/${userId}/role`, { role }),
    onSuccess: () => queryClient.invalidateQueries(['team']),
  });

  const removeMutation = useMutation({
    mutationFn: (userId) => api.delete(`/team/${userId}`),
    onSuccess: () => { queryClient.invalidateQueries(['team']); setRemoveId(null); },
  });

  const bulkDelete = useBulkDelete({ endpoint: '/team', queryKey: ['team'] });

  const columns = [
    { field: 'email', label: 'Email' },
    { field: 'name', label: 'Name', render: (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() || '-' },
    { field: 'role', label: 'Role', render: (r) => (
      <TextField select size="small" value={r.role_name || 'cashier'} onChange={(e) => roleMutation.mutate({ userId: r.id, role: e.target.value })} sx={{ minWidth: 120 }}>
        {ROLES.map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}
      </TextField>
    ) },
    { field: 'status', label: 'Status', render: (r) => <Chip label={r.status} size="small" color={r.status === 'active' ? 'success' : 'default'} /> },
    { field: 'actions', label: '', render: (r) => <IconButton size="small" color="error" onClick={() => setRemoveId(r.id)}><Delete /></IconButton> },
  ];

  return (
    <>
      <PageHeader title="Team" subtitle="Invite and manage team members" actionLabel="Invite Member" actionIcon={<PersonAdd />} onAction={() => setOpen(true)} />
      {limitError && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setLimitError('')}>{limitError}</Alert>}
      <BulkDeleteActions
        {...bulkDelete}
        title="Remove Team Members"
        deleteLabel="Remove selected"
        confirmLabel="Remove"
        onConfirm={bulkDelete.bulkDelete}
        isDeleting={bulkDelete.isDeleting}
      />
      <DataTable columns={columns} rows={data || []} loading={isLoading} onEmptyAction={() => setOpen(true)} {...empty} {...bulkDelete.selectionProps} />
      <FormDialog open={open} title="Invite Team Member" onClose={() => setOpen(false)} onSubmit={handleSubmit((d) => inviteMutation.mutate(d))} loading={inviteMutation.isPending}>
        <Grid item xs={12} sm={6}><TextField fullWidth label="First Name" {...register('first_name')} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Last Name" {...register('last_name')} /></Grid>
        <Grid item xs={12}><TextField fullWidth label="Email" type="email" {...register('email', { required: true })} /></Grid>
        <Grid item xs={12}><TextField fullWidth label="Password (optional)" type="password" {...register('password')} helperText="Leave blank to auto-generate" /></Grid>
        <Grid item xs={12}>
          <TextField fullWidth select label="Role" defaultValue="cashier" {...register('role')}>
            {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
        </Grid>
      </FormDialog>
      <ConfirmDialog open={!!removeId} title="Remove Member" message="Deactivate this team member?" onConfirm={() => removeMutation.mutate(removeId)} onCancel={() => setRemoveId(null)} danger confirmLabel="Remove" />
    </>
  );
}
