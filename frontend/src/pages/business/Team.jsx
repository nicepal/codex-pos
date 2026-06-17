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
import RHFTextField from '../../components/RHFTextField';
import ConfirmDialog from '../../components/ConfirmDialog';
import BulkDeleteActions from '../../components/BulkDeleteActions';
import useBulkDelete from '../../hooks/useBulkDelete';
import { emptyPresetProps } from '../../utils/emptyStatePresets';
import { formatDisplayText } from '../../utils/displayText';

const empty = emptyPresetProps('team');

const ROLES = ['manager', 'cashier'];

export default function TeamPage() {
  const [open, setOpen] = useState(false);
  const [removeId, setRemoveId] = useState(null);
  const [inviteError, setInviteError] = useState('');
  const [inviteNotice, setInviteNotice] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { register, handleSubmit, reset } = useForm();

  const [removeError, setRemoveError] = useState('');
  const [updatingRoleId, setUpdatingRoleId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.get('/team').then((r) => r.data.data),
  });

  const teamMembers = (data || []).filter((m) => m.role_name !== 'business_owner');

  const openInvite = () => {
    setInviteError('');
    setOpen(true);
  };

  const closeInvite = () => {
    setInviteError('');
    setOpen(false);
  };

  const inviteMutation = useMutation({
    mutationFn: (payload) => api.post('/team/invite', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['team']);
      closeInvite();
      reset();
      if (res.data?.data?.temp_password) {
        setInviteNotice(`Invited! Temp password: ${res.data.data.temp_password}`);
      }
    },
    onError: (err) => {
      setInviteError(err.response?.data?.message || 'Invite failed');
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => api.put(`/team/${userId}/role`, { role }),
    onMutate: ({ userId }) => {
      setUpdatingRoleId(userId);
      setRoleError('');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['team']);
    },
    onError: (err) => {
      setRoleError(err.response?.data?.message || 'Failed to update role');
    },
    onSettled: () => setUpdatingRoleId(null),
  });

  const handleRoleChange = (userId, role) => {
    roleMutation.mutate({ userId, role });
  };

  const resolveRole = (roleName) => (ROLES.includes(roleName) ? roleName : 'cashier');

  const removeMutation = useMutation({
    mutationFn: (userId) => api.delete(`/team/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['team']);
      setRemoveId(null);
      setRemoveError('');
    },
    onError: (err) => {
      setRemoveError(err.response?.data?.message || 'Failed to remove team member');
      setRemoveId(null);
    },
  });

  const bulkDelete = useBulkDelete({ endpoint: '/team', queryKey: ['team'] });

  const columns = [
    { field: 'email', label: 'Email' },
    { field: 'name', label: 'Name', render: (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() || '-' },
    { field: 'role', label: 'Role', render: (r) => (
      <TextField
        select
        size="small"
        value={resolveRole(r.role_name)}
        disabled={updatingRoleId === r.id || roleMutation.isPending}
        onChange={(e) => handleRoleChange(r.id, e.target.value)}
        sx={{ minWidth: 130 }}
      >
        {ROLES.map((role) => <MenuItem key={role} value={role}>{formatDisplayText(role)}</MenuItem>)}
      </TextField>
    ) },
    { field: 'status', label: 'Status', render: (r) => <Chip label={formatDisplayText(r.status)} size="small" color={r.status === 'active' ? 'success' : 'default'} /> },
    { field: 'actions', label: '', render: (r) => (
      <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setRemoveError(''); setRemoveId(r.id); }}>
        <Delete />
      </IconButton>
    ) },
  ];

  return (
    <>
      <PageHeader title="Team" subtitle="Invite and manage team members" actionLabel="Invite Member" actionIcon={<PersonAdd />} onAction={openInvite} />
      {inviteNotice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInviteNotice('')}>{inviteNotice}</Alert>}
      {roleError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRoleError('')}>{roleError}</Alert>}
      {removeError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRemoveError('')}>{removeError}</Alert>}
      <BulkDeleteActions
        {...bulkDelete}
        title="Remove Team Members"
        deleteLabel="Remove selected"
        confirmLabel="Remove"
        onConfirm={bulkDelete.bulkDelete}
        isDeleting={bulkDelete.isDeleting}
      />
      <DataTable columns={columns} rows={teamMembers} loading={isLoading} onEmptyAction={openInvite} {...empty} {...bulkDelete.selectionProps} />
      <FormDialog
        open={open}
        title="Invite Team Member"
        onClose={closeInvite}
        onSubmit={handleSubmit((d) => inviteMutation.mutate(d))}
        loading={inviteMutation.isPending}
        submitLabel="Invite"
        error={inviteError}
        errorAction={inviteError?.toLowerCase().includes('plan limit') ? {
          label: 'Upgrade plan',
          onClick: () => navigate('/subscription'),
        } : undefined}
      >
        <Grid item xs={12} sm={6}><TextField fullWidth label="First Name" {...register('first_name')} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Last Name" {...register('last_name')} /></Grid>
        <Grid item xs={12}><RHFTextField register={register} name="email" rules={{ required: true }} label="Email" type="email" /></Grid>
        <Grid item xs={12}><TextField fullWidth label="Password (optional)" type="password" {...register('password')} helperText="Leave blank to auto-generate" /></Grid>
        <Grid item xs={12}>
          <TextField fullWidth select label="Role" defaultValue="cashier" {...register('role')}>
            {ROLES.map((r) => <MenuItem key={r} value={r}>{formatDisplayText(r)}</MenuItem>)}
          </TextField>
        </Grid>
      </FormDialog>
      <ConfirmDialog
        open={!!removeId}
        title="Remove Member"
        message="Remove this team member? They will lose access to this business."
        onConfirm={() => removeMutation.mutate(removeId)}
        onCancel={() => setRemoveId(null)}
        loading={removeMutation.isPending}
        danger
        confirmLabel="Remove"
      />
    </>
  );
}
