import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Grid, IconButton, Chip, MenuItem } from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';
import BulkDeleteActions from '../../components/BulkDeleteActions';
import useBulkDelete from '../../hooks/useBulkDelete';
import RHFTextField from '../../components/RHFTextField';
import { emptyPresetProps } from '../../utils/emptyStatePresets';

const empty = emptyPresetProps('suppliers');

export default function SuppliersPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then((r) => r.data),
  });

  const openForm = (supplier = null) => {
    setEditing(supplier);
    reset(supplier || { name: '', email: '', phone: '', address: '', contact_person: '', status: 'active' });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => (editing
      ? api.put(`/suppliers/${editing.id}`, payload)
      : api.post('/suppliers', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries(['suppliers']);
      setOpen(false);
      setEditing(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/suppliers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['suppliers']); setDeleteId(null); },
  });

  const bulkDelete = useBulkDelete({ endpoint: '/suppliers', queryKey: ['suppliers'] });

  const rows = data?.data || [];

  const columns = [
    { field: 'name', label: 'Name' },
    { field: 'contact_person', label: 'Contact', render: (r) => r.contact_person || '-' },
    { field: 'email', label: 'Email', render: (r) => r.email || '-' },
    { field: 'phone', label: 'Phone', render: (r) => r.phone || '-' },
    { field: 'status', label: 'Status', render: (r) => <Chip label={r.status} size="small" color={r.status === 'active' ? 'success' : 'default'} /> },
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
      <PageHeader title="Suppliers" subtitle="Manage vendor contacts for purchasing" actionLabel="Add Supplier" actionIcon={<Add />} onAction={() => openForm()} />
      <BulkDeleteActions
        {...bulkDelete}
        title="Delete Suppliers"
        onConfirm={bulkDelete.bulkDelete}
        isDeleting={bulkDelete.isDeleting}
      />
      <DataTable columns={columns} rows={rows} loading={isLoading} onEmptyAction={() => openForm()} {...empty} {...bulkDelete.selectionProps} />

      <FormDialog
        open={open}
        title={editing ? 'Edit Supplier' : 'Add Supplier'}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
        loading={saveMutation.isPending}
        submitLabel={editing ? 'Update' : 'Add'}
      >
        <Grid item xs={12}>
          <RHFTextField
            register={register}
            name="name"
            rules={{ required: 'Company name is required' }}
            label="Company Name"
            error={!!errors.name}
            helperText={errors.name?.message}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFTextField
            register={register}
            name="contact_person"
            rules={{ required: 'Contact person is required' }}
            label="Contact Person"
            error={!!errors.contact_person}
            helperText={errors.contact_person?.message}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFTextField
            register={register}
            name="phone"
            rules={{ required: 'Phone is required' }}
            label="Phone"
            error={!!errors.phone}
            helperText={errors.phone?.message}
          />
        </Grid>
        <Grid item xs={12}><RHFTextField register={register} name="email" label="Email" type="email" /></Grid>
        <Grid item xs={12}><RHFTextField register={register} name="address" label="Address" multiline rows={2} /></Grid>
        {editing && (
          <Grid item xs={12}>
            <RHFTextField register={register} name="status" rules={{ required: true }} select label="Status">
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </RHFTextField>
          </Grid>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Supplier"
        message="Are you sure you want to remove this supplier?"
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
        danger
        confirmLabel="Delete"
      />
    </>
  );
}
