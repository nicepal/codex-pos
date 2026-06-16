import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Grid, TextField, IconButton, Chip, Box, MenuItem, FormControlLabel, Switch,
} from '@mui/material';
import { Add, Edit, Delete, Store } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import RHFTextField from '../../components/RHFTextField';
import ConfirmDialog from '../../components/ConfirmDialog';
import BulkDeleteActions from '../../components/BulkDeleteActions';
import useBulkDelete from '../../hooks/useBulkDelete';
import StatCard from '../../components/StatCard';
import { emptyPresetProps } from '../../utils/emptyStatePresets';

const empty = emptyPresetProps('branches');

export default function BranchesPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isPlanLimit, setIsPlanLimit] = useState(false);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, control } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches', { params: { limit: 200 } }).then((r) => r.data),
  });

  const openForm = (branch = null) => {
    setEditing(branch);
    setSaveError('');
    setIsPlanLimit(false);
    reset(branch || {
      name: '',
      code: '',
      phone: '',
      email: '',
      address: '',
      is_primary: false,
      status: 'active',
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => (editing
      ? api.put(`/branches/${editing.id}`, payload)
      : api.post('/branches', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries(['branches']);
      queryClient.invalidateQueries(['branches-filter']);
      queryClient.invalidateQueries(['pos-branches']);
      setOpen(false);
      setEditing(null);
      setSaveError('');
      setIsPlanLimit(false);
      reset();
    },
    onError: (err) => {
      setSaveError(err.response?.data?.message || 'Failed to save branch');
      setIsPlanLimit(err.response?.status === 403);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/branches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['branches']);
      queryClient.invalidateQueries(['branches-filter']);
      queryClient.invalidateQueries(['pos-branches']);
      setDeleteId(null);
    },
  });

  const bulkDelete = useBulkDelete({ endpoint: '/branches', queryKey: ['branches'] });

  const rows = data?.data || [];

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((b) =>
      [b.name, b.code, b.phone, b.address, b.email].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [rows, search]);

  const primaryBranch = rows.find((b) => b.is_primary);
  const activeCount = rows.filter((b) => b.status === 'active').length;

  const closeForm = () => {
    setOpen(false);
    setEditing(null);
    setSaveError('');
    setIsPlanLimit(false);
  };

  const columns = [
    { field: 'name', label: 'Name' },
    { field: 'code', label: 'Code', render: (r) => r.code || '—' },
    { field: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
    { field: 'email', label: 'Email', render: (r) => r.email || '—' },
    {
      field: 'is_primary',
      label: 'Primary',
      render: (r) => (r.is_primary
        ? <Chip label="Primary" size="small" color="primary" variant="outlined" />
        : <Chip label="—" size="small" variant="outlined" />),
    },
    {
      field: 'status',
      label: 'Status',
      render: (r) => (
        <Chip
          label={r.status || 'active'}
          size="small"
          color={r.status === 'active' ? 'success' : 'default'}
          sx={{ textTransform: 'capitalize' }}
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
    <>
      <PageHeader
        title="Branches"
        subtitle="Manage store locations for POS, orders, and reporting"
        actionLabel="Add Branch"
        actionIcon={<Add />}
        onAction={() => openForm()}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard title="Total Branches" value={rows.length} icon={<Store color="primary" />} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard title="Active" value={activeCount} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Primary Location"
            value={primaryBranch?.name || 'Not set'}
            subtitle={primaryBranch?.code || undefined}
          />
        </Grid>
      </Grid>

      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search by name, code, phone, or address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 320 } }}
        />
      </Box>

      <BulkDeleteActions
        {...bulkDelete}
        title="Delete Branches"
        onConfirm={bulkDelete.bulkDelete}
        isDeleting={bulkDelete.isDeleting}
      />

      <DataTable
        columns={columns}
        rows={filteredRows}
        loading={isLoading}
        onEmptyAction={() => openForm()}
        emptyActionIcon={<Add />}
        {...empty}
        {...bulkDelete.selectionProps}
      />

      <FormDialog
        open={open}
        title={editing ? 'Edit Branch' : 'Add Branch'}
        onClose={closeForm}
        onSubmit={handleSubmit((d) => saveMutation.mutate({
          ...d,
          is_primary: !!d.is_primary,
        }))}
        loading={saveMutation.isPending}
        submitLabel={editing ? 'Update' : 'Add Branch'}
        error={saveError}
        errorAction={isPlanLimit ? {
          label: 'Upgrade plan',
          onClick: () => navigate('/subscription'),
        } : undefined}
      >
        <Grid item xs={12}>
          <RHFTextField register={register} name="name" rules={{ required: true }} label="Branch Name" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Code" placeholder="e.g. MAIN" {...register('code')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Phone" {...register('phone')} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Email" type="email" {...register('email')} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Address" multiline rows={2} {...register('address')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth select label="Status" defaultValue="active" {...register('status')}>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
          <Controller
            name="is_primary"
            control={control}
            defaultValue={false}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                label="Primary branch"
              />
            )}
          />
        </Grid>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Branch"
        message="Are you sure you want to delete this branch? Orders linked to it may need reassignment."
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
        danger
        confirmLabel="Delete"
      />
    </>
  );
}
