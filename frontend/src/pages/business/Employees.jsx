import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Grid, TextField, MenuItem, IconButton, Chip } from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import RHFTextField from '../../components/RHFTextField';
import ConfirmDialog from '../../components/ConfirmDialog';
import BulkDeleteActions from '../../components/BulkDeleteActions';
import useBulkDelete from '../../hooks/useBulkDelete';
import { emptyPresetProps } from '../../utils/emptyStatePresets';

const empty = emptyPresetProps('employees');

const ROLES = ['manager', 'cashier'];
const STATUSES = ['active', 'inactive'];

export default function EmployeesPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get('/employees').then((r) => r.data),
  });

  const openForm = (employee = null) => {
    setEditing(employee);
    reset(employee || { name: '', email: '', phone: '', role: 'cashier', status: 'active', hired_at: '' });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => (editing
      ? api.put(`/employees/${editing.id}`, payload)
      : api.post('/employees', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setOpen(false);
      setEditing(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/employees/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['employees']); setDeleteId(null); },
  });

  const bulkDelete = useBulkDelete({ endpoint: '/employees', queryKey: ['employees'] });

  const rows = data?.data || [];

  const columns = [
    { field: 'name', label: 'Name' },
    { field: 'email', label: 'Email', render: (r) => r.email || '-' },
    { field: 'phone', label: 'Phone', render: (r) => r.phone || '-' },
    { field: 'role', label: 'Role', render: (r) => <Chip label={r.role} size="small" /> },
    { field: 'status', label: 'Status', render: (r) => <Chip label={r.status} size="small" color={r.status === 'active' ? 'success' : 'default'} /> },
    { field: 'hired_at', label: 'Hired', render: (r) => r.hired_at ? new Date(r.hired_at).toLocaleDateString() : '-' },
    {
      field: 'actions', label: 'Actions',
      render: (r) => (
        <>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); openForm(r); }}><Edit fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}><Delete fontSize="small" /></IconButton>
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Employees" subtitle="Manage staff and POS access roles" actionLabel="Add Employee" actionIcon={<Add />} onAction={() => openForm()} />
      <BulkDeleteActions
        {...bulkDelete}
        title="Delete Employees"
        onConfirm={bulkDelete.bulkDelete}
        isDeleting={bulkDelete.isDeleting}
      />
      <DataTable columns={columns} rows={rows} loading={isLoading} onEmptyAction={() => openForm()} {...empty} {...bulkDelete.selectionProps} />

      <FormDialog
        open={open}
        title={editing ? 'Edit Employee' : 'Add Employee'}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={handleSubmit((d) => saveMutation.mutate({ ...d, hired_at: d.hired_at || null }))}
        loading={saveMutation.isPending}
        submitLabel={editing ? 'Update' : 'Add'}
      >
        <Grid item xs={12}><RHFTextField register={register} name="name" rules={{ required: true }} label="Name" /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Email" type="email" {...register('email')} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Phone" {...register('phone')} /></Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth select label="Role" defaultValue="cashier" {...register('role')}>
            {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth select label="Status" defaultValue="active" {...register('status')}>
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12}><TextField fullWidth label="Hire Date" type="date" InputLabelProps={{ shrink: true }} {...register('hired_at')} /></Grid>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Employee"
        message="Are you sure you want to remove this employee?"
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
        danger
        confirmLabel="Delete"
      />
    </>
  );
}
