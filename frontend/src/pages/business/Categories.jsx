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
import { formatDisplayText } from '../../utils/displayText';

const empty = emptyPresetProps('categories');

export default function CategoriesPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories', { params: { tree: true, limit: 100 } }).then((r) => r.data),
  });

  const { data: categoriesList } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => api.get('/categories', { params: { limit: 100 } }).then((r) => r.data.data),
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => editing
      ? api.put(`/categories/${editing.id}`, payload)
      : api.post('/categories', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      queryClient.invalidateQueries(['categories-list']);
      setOpen(false);
      setEditing(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      queryClient.invalidateQueries(['categories-list']);
      setDeleteId(null);
    },
  });

  const bulkDelete = useBulkDelete({
    endpoint: '/categories',
    queryKey: ['categories', 'categories-list'],
  });

  const openEdit = (cat) => {
    setEditing(cat);
    reset({ name: cat.name, description: cat.description, parent_id: cat.parent_id || '', sort_order: cat.sort_order });
    setOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', description: '', parent_id: '', sort_order: 0 });
    setOpen(true);
  };

  const rows = data?.data || [];

  const columns = [
    { field: 'name', label: 'Name' },
    { field: 'slug', label: 'Slug' },
    { field: 'parent_name', label: 'Parent', render: (r) => r.parent_name || '-' },
    { field: 'status', label: 'Status', render: (r) => <Chip label={formatDisplayText(r.status)} size="small" color={r.status === 'active' ? 'success' : 'default'} /> },
    {
      field: 'actions', label: 'Actions',
      render: (r) => (
        <>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Edit fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}><Delete fontSize="small" /></IconButton>
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Categories" subtitle="Organize products into categories" actionLabel="Add Category" actionIcon={<Add />} onAction={openCreate} />
      <BulkDeleteActions
        {...bulkDelete}
        title="Delete Categories"
        onConfirm={bulkDelete.bulkDelete}
        isDeleting={bulkDelete.isDeleting}
      />
      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        {...empty}
        emptyActionIcon={<Add />}
        onEmptyAction={openCreate}
        {...bulkDelete.selectionProps}
      />

      <FormDialog
        open={open}
        title={editing ? 'Edit Category' : 'Add Category'}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit((d) => saveMutation.mutate({
          ...d,
          parent_id: d.parent_id || null,
          sort_order: parseInt(d.sort_order, 10) || 0,
        }))}
        loading={saveMutation.isPending}
        submitLabel={editing ? 'Update' : 'Create'}
      >
        <Grid item xs={12}><RHFTextField register={register} name="name" rules={{ required: true }} label="Name" /></Grid>
        <Grid item xs={12}><TextField fullWidth label="Description" multiline rows={2} {...register('description')} /></Grid>
        <Grid item xs={12}>
          <TextField fullWidth select label="Parent Category" {...register('parent_id')} defaultValue="">
            <MenuItem value="">None</MenuItem>
            {(categoriesList || []).filter((c) => c.id !== editing?.id).map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12}><TextField fullWidth label="Sort Order" type="number" {...register('sort_order')} /></Grid>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Category"
        message="Delete this category? Categories with subcategories cannot be deleted."
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
        danger
        confirmLabel="Delete"
      />
    </>
  );
}
