import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Tabs, Tab, Grid, TextField, Button, IconButton, Chip, Avatar,
  Card, CardContent, MenuItem, Divider, Checkbox, FormControlLabel, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import { ArrowBack, Add, Delete, Save } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { resolveImageUrl } from '../../utils/imageUrl';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import RHFTextField from '../../components/RHFTextField';
import ConfirmDialog from '../../components/ConfirmDialog';
import BulkDeleteToolbar from '../../components/BulkDeleteToolbar';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import useTenantFeatures from '../../hooks/useTenantFeatures';
import { formatDisplayText } from '../../utils/displayText';

function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [variants, setVariants] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [deleteImageId, setDeleteImageId] = useState(null);
  const [selectedImageIds, setSelectedImageIds] = useState([]);
  const [bulkDeleteImagesOpen, setBulkDeleteImagesOpen] = useState(false);
  const [selectedVariantIds, setSelectedVariantIds] = useState([]);
  const [serialForm, setSerialForm] = useState({ serial_number: '', branch_id: '' });
  const [batchForm, setBatchForm] = useState({ batch_number: '', quantity: '', expiry_date: '', branch_id: '' });
  const queryClient = useQueryClient();
  const { moneyLabel } = useBusinessCurrency();
  const { hasFeature } = useTenantFeatures();
  const catalogPro = hasFeature('catalog_pro');
  const { register, handleSubmit, reset } = useForm();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`).then((r) => r.data.data),
  });

  useEffect(() => {
    if (product) {
      reset(product);
      setVariants(product.variants || []);
    }
  }, [product, reset]);

  const updateMutation = useMutation({
    mutationFn: (payload) => api.put(`/products/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries(['product', id]),
  });

  const uploadImageMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const hasImages = (product?.images?.length || 0) > 0;
      formData.append('is_primary', hasImages ? 'false' : 'true');
      return api.post(`/products/${id}/images`, formData);
    },
    onSuccess: () => {
      setUploadError('');
      queryClient.invalidateQueries(['product', id]);
      queryClient.invalidateQueries(['products']);
    },
    onError: (err) => setUploadError(err.response?.data?.message || 'Image upload failed'),
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId) => api.delete(`/products/${id}/images/${imageId}`),
    onSuccess: () => { queryClient.invalidateQueries(['product', id]); setDeleteImageId(null); },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: (variantId) => api.delete(`/products/${id}/variants/${variantId}`),
    onSuccess: () => queryClient.invalidateQueries(['product', id]),
  });

  const bulkDeleteImagesMutation = useMutation({
    mutationFn: async (imageIds) => {
      await Promise.all(imageIds.map((imageId) => api.delete(`/products/${id}/images/${imageId}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['product', id]);
      setSelectedImageIds([]);
      setBulkDeleteImagesOpen(false);
    },
  });

  const bulkDeleteVariantsMutation = useMutation({
    mutationFn: async (variantIds) => {
      await Promise.all(variantIds.map((variantId) => api.delete(`/products/${id}/variants/${variantId}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['product', id]);
      setSelectedVariantIds([]);
      setBulkDeleteVariantsOpen(false);
    },
  });

  const [bulkDeleteVariantsOpen, setBulkDeleteVariantsOpen] = useState(false);

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches', { params: { limit: 100 } }).then((r) => r.data.data),
    enabled: catalogPro,
  });

  const { data: serials, refetch: refetchSerials } = useQuery({
    queryKey: ['product-serials', id],
    queryFn: () => api.get(`/products/${id}/serials`).then((r) => r.data.data),
    enabled: catalogPro && !!id,
  });

  const { data: batches, refetch: refetchBatches } = useQuery({
    queryKey: ['product-batches', id],
    queryFn: () => api.get(`/products/${id}/batches`).then((r) => r.data.data),
    enabled: catalogPro && !!id,
  });

  const addSerialMutation = useMutation({
    mutationFn: (payload) => api.post(`/products/${id}/serials`, payload),
    onSuccess: () => { refetchSerials(); setSerialForm({ serial_number: '', branch_id: '' }); },
  });

  const deleteSerialMutation = useMutation({
    mutationFn: (serialId) => api.delete(`/products/${id}/serials/${serialId}`),
    onSuccess: () => refetchSerials(),
  });

  const addBatchMutation = useMutation({
    mutationFn: (payload) => api.post(`/products/${id}/batches`, payload),
    onSuccess: () => { refetchBatches(); setBatchForm({ batch_number: '', quantity: '', expiry_date: '', branch_id: '' }); },
  });

  const deleteBatchMutation = useMutation({
    mutationFn: (batchId) => api.delete(`/products/${id}/batches/${batchId}`),
    onSuccess: () => refetchBatches(),
  });

  const toggleImageSelection = (imageId) => {
    setSelectedImageIds((prev) => (prev.includes(imageId) ? prev.filter((x) => x !== imageId) : [...prev, imageId]));
  };

  const toggleVariantSelection = (variantId) => {
    setSelectedVariantIds((prev) => (prev.includes(variantId) ? prev.filter((x) => x !== variantId) : [...prev, variantId]));
  };

  if (isLoading) return <LoadingState />;
  if (!product) return <Typography>Product not found</Typography>;

  const addVariant = () => {
    setVariants([...variants, { name: '', sku: '', sale_price: product.sale_price, stock_quantity: 0 }]);
  };

  const updateVariant = (idx, field, value) => {
    const next = [...variants];
    next[idx] = { ...next[idx], [field]: value };
    setVariants(next);
  };

  const saveGeneral = handleSubmit((d) => updateMutation.mutate({
    name: d.name,
    description: d.description,
    sku: d.sku,
    barcode: d.barcode,
    status: d.status,
    sale_price: parseFloat(d.sale_price),
    cost_price: parseFloat(d.cost_price || 0),
    stock_quantity: parseInt(d.stock_quantity || 0, 10),
    category_id: d.category_id || null,
    brand_id: d.brand_id || null,
    meta_title: d.meta_title,
    meta_description: d.meta_description,
    is_open_price: !!d.is_open_price,
    tracks_serials: !!d.tracks_serials,
    tracks_batches: !!d.tracks_batches,
  }));

  const saveVariants = () => updateMutation.mutate({
    variants: variants.map((v) => ({
      ...v,
      sale_price: parseFloat(v.sale_price || 0),
      cost_price: parseFloat(v.cost_price || 0),
      stock_quantity: parseInt(v.stock_quantity || 0, 10),
    })),
  });

  return (
    <Box>
      <PageHeader
        title={product.name}
        subtitle={`SKU: ${product.sku || '—'} · Stock: ${product.stock_quantity}`}
        action={(
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/products')}>Back to Products</Button>
        )}
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="General" />
        <Tab label={`Variants (${product.variants?.length || 0})`} />
        <Tab label={`Images (${product.images?.length || 0})`} />
        {catalogPro && <Tab label={`Serials (${serials?.length || 0})`} />}
        {catalogPro && <Tab label={`Batches (${batches?.length || 0})`} />}
      </Tabs>

      <TabPanel value={tab} index={0}>
        <form onSubmit={saveGeneral}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <RHFTextField register={register} name="name" rules={{ required: true }} label="Name" sx={{ mb: 2 }} />
              <TextField fullWidth label="Description" multiline rows={4} sx={{ mb: 2 }} {...register('description')} />
              <TextField fullWidth label="Meta Title" sx={{ mb: 2 }} {...register('meta_title')} />
              <TextField fullWidth label="Meta Description" multiline rows={2} {...register('meta_description')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <TextField fullWidth label="SKU" sx={{ mb: 2 }} {...register('sku')} />
                  <TextField fullWidth label="Barcode" sx={{ mb: 2 }} {...register('barcode')} />
                  <TextField fullWidth label={moneyLabel('Sale Price')} type="number" sx={{ mb: 2 }} {...register('sale_price')} />
                  <TextField fullWidth label={moneyLabel('Cost Price')} type="number" sx={{ mb: 2 }} {...register('cost_price')} />
                  <TextField fullWidth label="Stock" type="number" sx={{ mb: 2 }} {...register('stock_quantity')} />
                  <TextField fullWidth select label="Status" defaultValue="active" {...register('status')}>
                    {['active', 'inactive', 'draft'].map((s) => <MenuItem key={s} value={s}>{formatDisplayText(s)}</MenuItem>)}
                  </TextField>
                  {hasFeature('open_price_items') && (
                    <FormControlLabel
                      control={<Checkbox {...register('is_open_price')} defaultChecked={!!product.is_open_price} />}
                      label="Open price at POS"
                      sx={{ mt: 1, display: 'block' }}
                    />
                  )}
                  {catalogPro && (
                    <>
                      <FormControlLabel
                        control={<Checkbox {...register('tracks_serials')} defaultChecked={!!product.tracks_serials} />}
                        label="Track serial numbers"
                        sx={{ mt: 1, display: 'block' }}
                      />
                      <FormControlLabel
                        control={<Checkbox {...register('tracks_batches')} defaultChecked={!!product.tracks_batches} />}
                        label="Track batches / expiry"
                        sx={{ display: 'block' }}
                      />
                    </>
                  )}
                  <Button type="submit" variant="contained" startIcon={<Save />} fullWidth sx={{ mt: 2 }} disabled={updateMutation.isPending}>
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </form>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2, flexWrap: 'wrap' }}>
          <BulkDeleteToolbar
            count={selectedVariantIds.length}
            onClear={() => setSelectedVariantIds([])}
            onDelete={() => setBulkDeleteVariantsOpen(true)}
            label="variants selected"
          />
          <Button startIcon={<Add />} onClick={addVariant}>Add Variant</Button>
        </Box>
        {variants.map((v, idx) => (
          <Card key={v.id || `new-${idx}`} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                {v.id && (
                  <Grid item xs="auto">
                    <Checkbox
                      checked={selectedVariantIds.includes(v.id)}
                      onChange={() => toggleVariantSelection(v.id)}
                    />
                  </Grid>
                )}
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth label="Name" value={v.name} onChange={(e) => updateVariant(idx, 'name', e.target.value)} />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField fullWidth label="SKU" value={v.sku || ''} onChange={(e) => updateVariant(idx, 'sku', e.target.value)} />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField fullWidth label={moneyLabel('Price')} type="number" value={v.sale_price} onChange={(e) => updateVariant(idx, 'sale_price', e.target.value)} />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField fullWidth label="Stock" type="number" value={v.stock_quantity} onChange={(e) => updateVariant(idx, 'stock_quantity', e.target.value)} />
                </Grid>
                <Grid item xs={6} sm={3} sx={{ textAlign: 'right' }}>
                  {v.id && (
                    <IconButton color="error" onClick={() => deleteVariantMutation.mutate(v.id)}><Delete /></IconButton>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}
        <Button variant="contained" startIcon={<Save />} onClick={saveVariants} disabled={updateMutation.isPending}>Save Variants</Button>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <BulkDeleteToolbar
          count={selectedImageIds.length}
          onClear={() => setSelectedImageIds([])}
          onDelete={() => setBulkDeleteImagesOpen(true)}
          label="images selected"
        />
        <Button variant="outlined" component="label" sx={{ mb: 2 }} disabled={uploadImageMutation.isPending}>
          {uploadImageMutation.isPending ? 'Uploading...' : 'Upload Image'}
          <input type="file" hidden accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadImageMutation.mutate(file);
            e.target.value = '';
          }} />
        </Button>
        {uploadError && <Typography color="error" variant="body2" sx={{ mb: 2 }}>{uploadError}</Typography>}
        <Grid container spacing={2}>
          {(product.images || []).map((img) => (
            <Grid item xs={6} sm={4} md={3} key={img.id}>
              <Card variant="outlined" sx={{ position: 'relative' }}>
                <Checkbox
                  checked={selectedImageIds.includes(img.id)}
                  onChange={() => toggleImageSelection(img.id)}
                  sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1, bgcolor: 'background.paper', borderRadius: 1 }}
                />
                <Avatar variant="rounded" src={resolveImageUrl(img.url)} sx={{ width: '100%', height: 140, borderRadius: 0 }} />
                <CardContent sx={{ py: 1 }}>
                  {img.is_primary && <Chip label="Primary" size="small" color="primary" sx={{ mb: 1 }} />}
                  <IconButton size="small" color="error" onClick={() => setDeleteImageId(img.id)}><Delete fontSize="small" /></IconButton>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        {!product.images?.length && (
          <Typography color="text.secondary">No images yet. Upload one above.</Typography>
        )}
      </TabPanel>

      {catalogPro && (
        <TabPanel value={tab} index={3}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Serial number" value={serialForm.serial_number}
                onChange={(e) => setSerialForm({ ...serialForm, serial_number: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth select label="Branch" value={serialForm.branch_id}
                onChange={(e) => setSerialForm({ ...serialForm, branch_id: e.target.value })}>
                <MenuItem value="">Any</MenuItem>
                {(branches || []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button variant="contained" startIcon={<Add />} fullWidth sx={{ height: '56px' }}
                disabled={!serialForm.serial_number || addSerialMutation.isPending}
                onClick={() => addSerialMutation.mutate({
                  serial_number: serialForm.serial_number,
                  branch_id: serialForm.branch_id || null,
                })}>
                Add serial
              </Button>
            </Grid>
          </Grid>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Serial</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {(serials || []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.serial_number}</TableCell>
                  <TableCell><Chip label={formatDisplayText(s.status)} size="small" /></TableCell>
                  <TableCell>{s.branch_name || '—'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="error" onClick={() => deleteSerialMutation.mutate(s.id)}><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!serials?.length && (
                <TableRow><TableCell colSpan={4} align="center">No serial numbers</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TabPanel>
      )}

      {catalogPro && (
        <TabPanel value={tab} index={4}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Batch number" value={batchForm.batch_number}
                onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value })} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField fullWidth label="Quantity" type="number" value={batchForm.quantity}
                onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth label="Expiry date" type="date" InputLabelProps={{ shrink: true }}
                value={batchForm.expiry_date} onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField fullWidth select label="Branch" value={batchForm.branch_id}
                onChange={(e) => setBatchForm({ ...batchForm, branch_id: e.target.value })}>
                <MenuItem value="">Default</MenuItem>
                {(branches || []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button variant="contained" startIcon={<Add />} fullWidth sx={{ height: '56px' }}
                disabled={!batchForm.batch_number || addBatchMutation.isPending}
                onClick={() => addBatchMutation.mutate({
                  batch_number: batchForm.batch_number,
                  quantity: parseInt(batchForm.quantity, 10) || 0,
                  expiry_date: batchForm.expiry_date || null,
                  branch_id: batchForm.branch_id || null,
                })}>
                Add batch
              </Button>
            </Grid>
          </Grid>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Batch</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Expiry</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {(batches || []).map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.batch_number}</TableCell>
                  <TableCell>{b.quantity}</TableCell>
                  <TableCell>{b.expiry_date ? new Date(b.expiry_date).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>{b.branch_name || '—'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="error" onClick={() => deleteBatchMutation.mutate(b.id)}><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!batches?.length && (
                <TableRow><TableCell colSpan={5} align="center">No batches</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TabPanel>
      )}

      <ConfirmDialog
        open={!!deleteImageId}
        title="Remove Image"
        message="Delete this product image?"
        onConfirm={() => deleteImageMutation.mutate(deleteImageId)}
        onCancel={() => setDeleteImageId(null)}
        loading={deleteImageMutation.isPending}
        danger
        confirmLabel="Delete"
      />

      <ConfirmDialog
        open={bulkDeleteImagesOpen}
        title="Delete Images"
        message={`Delete ${selectedImageIds.length} image(s)?`}
        onConfirm={() => bulkDeleteImagesMutation.mutate(selectedImageIds)}
        onCancel={() => setBulkDeleteImagesOpen(false)}
        loading={bulkDeleteImagesMutation.isPending}
        danger
        confirmLabel="Delete"
      />

      <ConfirmDialog
        open={bulkDeleteVariantsOpen}
        title="Delete Variants"
        message={`Delete ${selectedVariantIds.length} variant(s)?`}
        onConfirm={() => bulkDeleteVariantsMutation.mutate(selectedVariantIds)}
        onCancel={() => setBulkDeleteVariantsOpen(false)}
        loading={bulkDeleteVariantsMutation.isPending}
        danger
        confirmLabel="Delete"
      />
    </Box>
  );
}
