import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ActionIcon,
  Avatar,
  Badge,
  Group,
  NativeSelect,
  TextInput,
  Tooltip,
  SimpleGrid,
} from '@mantine/core';
import { Add, Edit, Delete, Visibility, Image, ContentCopy, UploadFile, Download } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { Button as MuiButton, Stack as MuiStack } from '@mui/material';
import api from '../../services/api';
import { resolveImageUrl } from '../../utils/imageUrl';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import RHFTextField from '../../components/RHFTextField';
import RHFRichTextEditor from '../../components/RHFRichTextEditor';
import ConfirmDialog from '../../components/ConfirmDialog';
import BulkDeleteActions from '../../components/BulkDeleteActions';
import useBulkDelete from '../../hooks/useBulkDelete';
import { emptyPresetProps } from '../../utils/emptyStatePresets';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import { formatDisplayText } from '../../utils/displayText';
import useTenantFeatures from '../../hooks/useTenantFeatures';
import ProductsImportWizard from '../../components/ProductsImportWizard';
import { downloadProductImportSampleExcel } from '../../utils/productImport';

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
    <ActionIcon component="label" size="sm" variant="subtle" color="codex" onClick={(e) => e.stopPropagation()}>
      <Image fontSize="small" />
      <input type="file" hidden accept="image/*" onChange={handleChange} />
    </ActionIcon>
  );
}

function stockChip(qty) {
  if (qty <= 0) return <Badge size="sm" color="red">Out of stock</Badge>;
  if (qty <= 10) return <Badge size="sm" color="yellow">{`Low (${qty})`}</Badge>;
  return (
    <Badge size="sm" color="green" variant="outline">
      {qty}
    </Badge>
  );
}

export default function ProductsPage() {
  const { formatMoney, moneyLabel } = useBusinessCurrency();
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
  const [importOpen, setImportOpen] = useState(false);
  const queryClient = useQueryClient();
  const { hasFeature } = useTenantFeatures();
  const { register, handleSubmit, reset, control } = useForm();

  const queryParams = {
    page,
    limit,
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
    reset(
      product || {
        name: '',
        sku: '',
        barcode: '',
        sale_price: '',
        cost_price: '',
        stock_quantity: 0,
        description: '',
        category_id: '',
        brand_id: '',
        status: 'active',
      },
    );
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing ? api.put(`/products/${editing.id}`, payload) : api.post('/products', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setOpen(false);
      setEditing(null);
      reset();
    },
    onError: (err) => {
      if (err.response?.status === 403) {
        alert(err.response?.data?.message || 'Plan limit reached. Upgrade your subscription.');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setDeleteId(null);
    },
  });

  const copyMutation = useMutation({
    mutationFn: (id) => api.post(`/products/${id}/duplicate`).then((r) => r.data.data),
    onSuccess: (product) => {
      queryClient.invalidateQueries(['products']);
      navigate(`/products/${product.id}`);
    },
    onError: (err) => {
      if (err.response?.status === 403) {
        alert(err.response?.data?.message || 'Plan limit reached. Upgrade your subscription.');
        return;
      }
      alert(err.response?.data?.message || 'Failed to duplicate product');
    },
  });

  const bulkDelete = useBulkDelete({ endpoint: '/products', queryKey: ['products'] });

  const rows = data?.data || [];
  const pagination = data?.pagination;

  const columns = [
    {
      field: 'image',
      label: '',
      render: (r) => (
        <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
          <Avatar radius="sm" src={resolveImageUrl(r.image_url)} size={40}>
            {r.name?.[0]}
          </Avatar>
          <ProductImageUpload
            productId={r.id}
            hasImage={!!r.image_url}
            onDone={() => queryClient.invalidateQueries(['products'])}
          />
        </Group>
      ),
    },
    { field: 'name', label: 'Name' },
    { field: 'sku', label: 'SKU', render: (r) => r.sku || '-' },
    { field: 'sale_price', label: 'Price', render: (r) => formatMoney(r.sale_price) },
    { field: 'stock_quantity', label: 'Stock', render: (r) => stockChip(r.stock_quantity) },
    {
      field: 'status',
      label: 'Status',
      render: (r) => (
        <Badge size="sm" color={r.status === 'active' ? 'green' : 'gray'}>
          {formatDisplayText(r.status)}
        </Badge>
      ),
    },
    {
      field: 'actions',
      label: 'Actions',
      render: (r) => (
        <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
          <ActionIcon size="sm" variant="subtle" onClick={() => navigate(`/products/${r.id}`)}>
            <Visibility fontSize="small" />
          </ActionIcon>
          <ActionIcon size="sm" variant="subtle" onClick={() => openForm(r)}>
            <Edit fontSize="small" />
          </ActionIcon>
          <Tooltip label="Duplicate product">
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={() => copyMutation.mutate(r.id)}
              disabled={copyMutation.isPending && copyMutation.variables === r.id}
            >
              <ContentCopy fontSize="small" />
            </ActionIcon>
          </Tooltip>
          <ActionIcon size="sm" variant="subtle" color="red" onClick={() => setDeleteId(r.id)}>
            <Delete fontSize="small" />
          </ActionIcon>
        </Group>
      ),
    },
  ];

  const onSubmit = (d) =>
    saveMutation.mutate({
      name: d.name,
      sku: d.sku,
      barcode: d.barcode,
      description: d.description,
      status: d.status,
      sale_price: parseFloat(d.sale_price),
      cost_price: parseFloat(d.cost_price || 0),
      stock_quantity: parseInt(d.stock_quantity || 0, 10),
      category_id: d.category_id || null,
      brand_id: d.brand_id || null,
    });

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Manage catalog, pricing, and stock"
        action={(
          <MuiStack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <MuiButton
              variant="outlined"
              startIcon={<Download />}
              onClick={downloadProductImportSampleExcel}
            >
              Sample Excel
            </MuiButton>
            {hasFeature('catalog_pro') && (
              <MuiButton
                variant="outlined"
                startIcon={<UploadFile />}
                onClick={() => setImportOpen(true)}
              >
                Bulk Import
              </MuiButton>
            )}
            <MuiButton variant="contained" startIcon={<Add />} onClick={() => openForm()}>
              Add Product
            </MuiButton>
          </MuiStack>
        )}
      />

      <Group gap="md" mb="md" wrap="wrap" align="flex-end">
        <TextInput
          label="Search"
          placeholder="Name, SKU, barcode"
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setPage(1);
          }}
          w={220}
        />
        <NativeSelect
          label="Category"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.currentTarget.value);
            setPage(1);
          }}
          w={160}
          data={[
            { value: '', label: 'All' },
            ...(categories || []).map((c) => ({ value: String(c.id), label: c.name })),
          ]}
        />
        <NativeSelect
          label="Brand"
          value={brandFilter}
          onChange={(e) => {
            setBrandFilter(e.currentTarget.value);
            setPage(1);
          }}
          w={160}
          data={[
            { value: '', label: 'All' },
            ...(brands || []).map((b) => ({ value: String(b.id), label: b.name })),
          ]}
        />
        <NativeSelect
          label="Status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.currentTarget.value);
            setPage(1);
          }}
          w={140}
          data={[
            { value: '', label: 'All' },
            ...STATUSES.map((s) => ({ value: s, label: formatDisplayText(s) })),
          ]}
        />
      </Group>

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
        onRowsPerPageChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
        {...bulkDelete.selectionProps}
      />

      <FormDialog
        open={open}
        title={editing ? 'Edit Product' : 'Add Product'}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit(onSubmit)}
        loading={saveMutation.isPending}
        submitLabel={editing ? 'Update' : 'Create'}
      >
        <RHFTextField register={register} name="name" rules={{ required: true }} label="Name" />
        <NativeSelect
          label="Category"
          w="100%"
          {...register('category_id')}
          data={[
            { value: '', label: 'None' },
            ...(categories || []).map((c) => ({ value: String(c.id), label: c.name })),
          ]}
        />
        <NativeSelect
          label="Brand"
          w="100%"
          {...register('brand_id')}
          data={[
            { value: '', label: 'None' },
            ...(brands || []).map((b) => ({ value: String(b.id), label: b.name })),
          ]}
        />
        <SimpleGrid cols={2} spacing="md">
          <TextInput label="SKU" w="100%" {...register('sku')} />
          <TextInput label="Barcode" w="100%" {...register('barcode')} />
        </SimpleGrid>
        <SimpleGrid cols={3} spacing="md">
          <TextInput label={moneyLabel('Cost Price')} type="number" step="0.01" w="100%" {...register('cost_price')} />
          <RHFTextField
            register={register}
            name="sale_price"
            rules={{ required: true }}
            label={moneyLabel('Sale Price')}
            type="number"
            inputProps={{ step: '0.01' }}
          />
          <TextInput label="Stock" type="number" w="100%" {...register('stock_quantity')} />
        </SimpleGrid>
        <NativeSelect
          label="Status"
          w="100%"
          {...register('status')}
          data={STATUSES.map((s) => ({ value: s, label: formatDisplayText(s) }))}
        />
        <RHFRichTextEditor control={control} name="description" label="Description" minHeight={140} />
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

      <ProductsImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => queryClient.invalidateQueries(['products'])}
      />
    </>
  );
}
