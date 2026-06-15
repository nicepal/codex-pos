import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, TextField, MenuItem, IconButton, Chip, Avatar, Grid,
} from '@mui/material';
import { Add, Edit, Delete, Visibility, Image } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { resolveImageUrl } from '../../utils/imageUrl';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';
import BulkDeleteActions from '../../components/BulkDeleteActions';
import useBulkDelete from '../../hooks/useBulkDelete';
import { emptyPresetProps } from '../../utils/emptyStatePresets';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';

const empty = emptyPresetProps('products');

const STATUSES = ['active', 'inactive', 'draft'];

function ProductImageUpload({ productId, hasImage, onDone }) {
  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_primary', hasImage ? 'false' : 'true');
    try {
      await api.post(`/products/${productId}/images`, formData);
      onDone?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Image upload failed');
    }
    e.target.value = '';
  };

  return (
    <IconButton component="label" size="small" color="primary" onClick={(e) => e.stopPropagation()}>
      <Image fontSize="small" />
      <input type="file" hidden accept="image/*" onChange={handleChange} />
    </IconButton>
  );
}

function stockChip(qty) {
  if (qty <= 0) return <Chip label="Out of stock" size="small" color="error" />;
  if (qty <= 10) return <Chip label={`Low (${qty})`} size="small" color="warning" />;
  return <Chip label={qty} size="small" color="success" variant="outlined" />;
}

export default function ProductsPage() {
  const { formatMoney } = useBusinessCurrency();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const queryParams = {
    page, limit,
    q: search || undefined,
    category_id: categoryFilter || undefined,
    brand_id: brandFilter || undefined,
    status: statusFilter || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['products', queryParams],
    queryFn: () => api.get('/products', { params: queryParams }).then((r) => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => api.get('/categories', { params: { limit: 100 } }).then((r) => r.data.data),
  });

  const { data: brands } = useQuery({
    queryKey: ['brands-list'],
    queryFn: () => api.get('/brands', { params: { limit: 100 } }).then((r) => r.data.data),
  });

  const openForm = (product = null) => {
    setEditing(product);
    reset(product || {
      name: '', sku: '', barcode: '', sale_price: '', cost_price: '', stock_quantity: 0,
      description: '', category_id: '', brand_id: '', status: 'active',
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => (editing
      ? api.put(`/products/${editing.id}`, payload)
      : api.post('/products', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setOpen(false);
      setEditing(null);
      reset();
    },
    onError: (err) => {
      if (err.response?.status === 403) alert(err.response?.data?.message || 'Plan limit reached. Upgrade your subscription.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['products']); setDeleteId(null); },
  });

  const bulkDelete = useBulkDelete({ endpoint: '/products', queryKey: ['products'] });

  const rows = data?.data || [];
  const pagination = data?.pagination;

  const columns = [
    {
      field: 'image', label: '',
      render: (r) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <Avatar variant="rounded" src={resolveImageUrl(r.image_url)} sx={{ width: 40, height: 40 }}>{r.name?.[0]}</Avatar>
          <ProductImageUpload productId={r.id} hasImage={!!r.image_url} onDone={() => queryClient.invalidateQueries(['products'])} />
        </Box>
      ),
    },
    { field: 'name', label: 'Name' },
    { field: 'sku', label: 'SKU', render: (r) => r.sku || '-' },
    { field: 'sale_price', label: 'Price', render: (r) => formatMoney(r.sale_price) },
    { field: 'stock_quantity', label: 'Stock', render: (r) => stockChip(r.stock_quantity) },
    { field: 'status', label: 'Status', render: (r) => <Chip label={r.status} size="small" color={r.status === 'active' ? 'success' : 'default'} /> },
    {
      field: 'actions', label: 'Actions',
      render: (r) => (
        <>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/products/${r.id}`); }}><Visibility fontSize="small" /></IconButton>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); openForm(r); }}><Edit fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}><Delete fontSize="small" /></IconButton>
        </>
      ),
    },
  ];

  const onSubmit = (d) => saveMutation.mutate({
    ...d,
    sale_price: parseFloat(d.sale_price),
    cost_price: parseFloat(d.cost_price || 0),
    stock_quantity: parseInt(d.stock_quantity || 0, 10),
    category_id: d.category_id || null,
    brand_id: d.brand_id || null,
  });

  return (
    <>
      <PageHeader title="Products" subtitle="Manage catalog, pricing, and stock" actionLabel="Add Product" actionIcon={<Add />} onAction={() => openForm()} />

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <TextField size="small" label="Search" placeholder="Name, SKU, barcode" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} sx={{ minWidth: 200 }} />
        <TextField size="small" select label="Category" value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} sx={{ minWidth: 140 }}>
          <MenuItem value="">All</MenuItem>
          {(categories || []).map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Brand" value={brandFilter}
          onChange={(e) => { setBrandFilter(e.target.value); setPage(1); }} sx={{ minWidth: 140 }}>
          <MenuItem value="">All</MenuItem>
          {(brands || []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Status" value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} sx={{ minWidth: 120 }}>
          <MenuItem value="">All</MenuItem>
          {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      </Box>

      <BulkDeleteActions
        {...bulkDelete}
        title="Delete Products"
        message={`Delete ${bulkDelete.selectedIds.length} product(s)? This cannot be undone.`}
        onConfirm={bulkDelete.bulkDelete}
        isDeleting={bulkDelete.isDeleting}
      />

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        emptyTitle={empty.emptyTitle}
        emptyMessage={empty.emptyMessage}
        emptyActionLabel={empty.emptyActionLabel}
        emptyBenefits={empty.emptyBenefits}
        emptyIllustration={empty.emptyIllustration}
        emptyActionIcon={<Add />}
        onEmptyAction={() => openForm()}
        onRowClick={(r) => navigate(`/products/${r.id}`)}
        pagination={pagination}
        onPageChange={setPage}
        onRowsPerPageChange={(l) => { setLimit(l); setPage(1); }}
        {...bulkDelete.selectionProps}
      />

      <FormDialog
        open={open}
        title={editing ? 'Edit Product' : 'Add Product'}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={handleSubmit(onSubmit)}
        loading={saveMutation.isPending}
        submitLabel={editing ? 'Update' : 'Create'}
      >
        <Grid item xs={12}><TextField fullWidth label="Name" {...register('name', { required: true })} /></Grid>
        <Grid item xs={12}>
          <TextField fullWidth select label="Category" defaultValue="" {...register('category_id')}>
            <MenuItem value="">None</MenuItem>
            {(categories || []).map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth select label="Brand" defaultValue="" {...register('brand_id')}>
            <MenuItem value="">None</MenuItem>
            {(brands || []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={6}><TextField fullWidth label="SKU" {...register('sku')} /></Grid>
        <Grid item xs={6}><TextField fullWidth label="Barcode" {...register('barcode')} /></Grid>
        <Grid item xs={4}><TextField fullWidth label="Cost Price" type="number" inputProps={{ step: '0.01' }} {...register('cost_price')} /></Grid>
        <Grid item xs={4}><TextField fullWidth label="Sale Price" type="number" inputProps={{ step: '0.01' }} {...register('sale_price', { required: true })} /></Grid>
        <Grid item xs={4}><TextField fullWidth label="Stock" type="number" {...register('stock_quantity')} /></Grid>
        <Grid item xs={12}>
          <TextField fullWidth select label="Status" defaultValue="active" {...register('status')}>
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12}><TextField fullWidth label="Description" multiline rows={3} {...register('description')} /></Grid>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Product"
        message="Are you sure you want to delete this product?"
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
        danger
        confirmLabel="Delete"
      />
    </>
  );
}
