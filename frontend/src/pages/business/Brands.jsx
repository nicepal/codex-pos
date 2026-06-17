import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Grid, TextField, IconButton, Chip } from '@mui/material';
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
import { formatDisplayText } from '../../utils/displayText';

const empty = emptyPresetProps('brands');

export default function BrandsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.get('/brands').then((r) => r.data),
  });

  const openForm = (brand = null) => {
    setEditing(brand);
    reset(brand || { name: '', status: 'active' });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => (editing ? api.put(`/brands/${editing.id}`, payload) : api.post('/brands', payload)),
    onSuccess: () => { queryClient.invalidateQueries(['brands']); setOpen(false); setEditing(null); reset(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/brands/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['brands']); setDeleteId(null); },
  });

  const bulkDelete = useBulkDelete({ endpoint: '/brands', queryKey: ['brands'] });

  const columns = [
    { field: 'name', label: 'Name' },
    { field: 'slug', label: 'Slug' },
    { field: 'status', label: 'Status', render: (r) => <Chip label={formatDisplayText(r.status)} size="small" color={r.status === 'active' ? 'success' : 'default'} /> },
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
      <PageHeader title="Brands" subtitle="Manage and organize your product brands" actionLabel="Add Brand" actionIcon={<Add />} onAction={() => openForm()} />
      <BulkDeleteActions
        {...bulkDelete}
        title="Delete Brands"
        onConfirm={bulkDelete.bulkDelete}
        isDeleting={bulkDelete.isDeleting}
      />
      <DataTable columns={columns} rows={data?.data || []} loading={isLoading} onEmptyAction={() => openForm()} {...empty} {...bulkDelete.selectionProps} />
      <FormDialog open={open} title={editing ? 'Edit Brand' : 'Add Brand'} onClose={() => setOpen(false)} onSubmit={handleSubmit((d) => saveMutation.mutate(d))} loading={saveMutation.isPending}>
        <Grid item xs={12}><RHFTextField register={register} name="name" rules={{ required: true }} label="Name" /></Grid>
      </FormDialog>
      <ConfirmDialog open={!!deleteId} title="Delete Brand" message="Delete this brand?" onConfirm={() => deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} danger confirmLabel="Delete" />
    </>
  );
}
