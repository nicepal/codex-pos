import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Chip, Grid, TextField, MenuItem, Typography, IconButton, Stack, Tooltip,
} from '@mui/material';
import { Add, Delete, Visibility, LocalShipping, Cancel, Inventory2, DeleteOutline, PictureAsPdf } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import RHFTextField from '../../components/RHFTextField';
import { emptyPresetProps } from '../../utils/emptyStatePresets';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import { downloadBlob, fileNameFromDisposition } from '../../utils/fileDownload';
import { formatDisplayText } from '../../utils/displayText';

const empty = emptyPresetProps('purchaseOrders');

export default function PurchaseOrdersPage() {
  const { formatMoney, moneyLabel } = useBusinessCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [lineItems, setLineItems] = useState([{ product_id: '', quantity: 1, unit_cost: 0 }]);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { register, handleSubmit, reset } = useForm({ defaultValues: { status: 'draft' } });

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => api.get('/purchase-orders').then((r) => r.data),
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-po'],
    queryFn: () => api.get('/suppliers').then((r) => r.data.data),
  });

  const { data: products } = useQuery({
    queryKey: ['products-po'],
    queryFn: () => api.get('/products', { params: { limit: 200 } }).then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/purchase-orders', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['purchase-orders']);
      setOpen(false);
      reset({ status: 'draft' });
      setLineItems([{ product_id: '', quantity: 1, unit_cost: 0 }]);
      setSearchParams({});
    },
  });

  const receiveMutation = useMutation({
    mutationFn: (id) => api.post(`/purchase-orders/${id}/receive`),
    onSuccess: () => queryClient.invalidateQueries(['purchase-orders']),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/purchase-orders/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries(['purchase-orders']),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/purchase-orders/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['purchase-orders']),
  });

  const downloadPdfMutation = useMutation({
    mutationFn: async (row) => {
      const response = await api.get(`/purchase-orders/${row.id}/pdf`, { responseType: 'blob' });
      const fallbackName = `PO-${(row.po_number || row.id).replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
      const disposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
      const fileName = fileNameFromDisposition(disposition, fallbackName);
      downloadBlob(response.data, fileName);
    },
  });

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setOpen(true);
      const productId = searchParams.get('productId');
      if (productId) {
        setLineItems([{ product_id: productId, quantity: 1, unit_cost: 0 }]);
      }
    }
  }, [searchParams]);

  const onCloseDialog = () => {
    setOpen(false);
    setSearchParams({});
  };

  const statusColor = (status) => ({
    draft: 'default',
    ordered: 'info',
    received: 'success',
    cancelled: 'error',
  }[status] || 'default');

  const isBusy = receiveMutation.isPending || updateStatusMutation.isPending || deleteMutation.isPending || downloadPdfMutation.isPending;

  const columns = [
    { field: 'po_number', label: 'PO #' },
    { field: 'supplier_name', label: 'Supplier' },
    { field: 'status', label: 'Status', render: (r) => <Chip label={formatDisplayText(r.status)} size="small" color={statusColor(r.status)} /> },
    {
      field: 'progress',
      label: 'Received',
      render: (r) => `${r.received_items || 0}/${r.total_items || 0}`,
    },
    { field: 'total_amount', label: 'Total', align: 'right', render: (r) => formatMoney(r.total_amount) },
    { field: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString() },
    {
      field: 'actions', label: 'Actions',
      render: (r) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/purchase-orders/${r.id}`); }}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download PDF">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); downloadPdfMutation.mutate(r); }} disabled={downloadPdfMutation.isPending}>
              <PictureAsPdf fontSize="small" />
            </IconButton>
          </Tooltip>
          {r.status === 'draft' && (
            <Tooltip title="Mark Ordered">
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: r.id, status: 'ordered' }); }}
                disabled={isBusy}
              >
                <LocalShipping fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {(r.status === 'ordered') && (
            <Tooltip title="Receive Stock">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); receiveMutation.mutate(r.id); }} disabled={isBusy}>
                <Inventory2 fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {(r.status === 'draft' || r.status === 'ordered') && (
            <Tooltip title="Cancel">
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: r.id, status: 'cancelled' }); }}
                disabled={isBusy}
              >
                <Cancel fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {(r.status === 'draft') && (
            <Tooltip title="Delete Draft">
              <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(r.id); }} disabled={isBusy}>
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ];

  const totalValue = useMemo(
    () => lineItems.reduce((sum, i) => sum + ((parseInt(i.quantity, 10) || 0) * (parseFloat(i.unit_cost) || 0)), 0),
    [lineItems]
  );

  return (
    <>
      <PageHeader title="Purchase Orders" subtitle="Order stock from suppliers" actionLabel="New PO" actionIcon={<Add />} onAction={() => setOpen(true)} />
      <DataTable
        columns={columns}
        rows={data?.data || []}
        loading={isLoading}
        onEmptyAction={() => setOpen(true)}
        onRowClick={(row) => navigate(`/purchase-orders/${row.id}`)}
        emptyActionIcon={<Add />}
        {...empty}
      />

      <FormDialog
        open={open}
        title="Create Purchase Order"
        onClose={onCloseDialog}
        onSubmit={handleSubmit((d) => createMutation.mutate({ ...d, items: lineItems.filter((i) => i.product_id) }))}
        loading={createMutation.isPending}
        submitLabel="Create"
        maxWidth="md"
      >
        <Grid item xs={12}>
          <RHFTextField register={register} name="supplier_id" rules={{ required: true }} select label="Supplier" defaultValue="">
            <MenuItem value="">Select supplier</MenuItem>
            {(suppliers || []).map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </RHFTextField>
        </Grid>
        <Grid item xs={12}>
          <RHFTextField register={register} name="status" select label="Initial Status" defaultValue="draft">
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="ordered">Ordered</MenuItem>
          </RHFTextField>
        </Grid>
        <Grid item xs={12}><Typography variant="subtitle2">Line Items</Typography></Grid>
        {lineItems.map((item, idx) => (
          <Grid item xs={12} key={idx}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField select label="Product" size="small" sx={{ flex: 2 }} value={item.product_id} onChange={(e) => { const n = [...lineItems]; n[idx].product_id = e.target.value; setLineItems(n); }}>
                <MenuItem value="">Select</MenuItem>
                {(products || []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </TextField>
              <TextField label="Qty" type="number" size="small" sx={{ width: 80 }} value={item.quantity} onChange={(e) => { const n = [...lineItems]; n[idx].quantity = parseInt(e.target.value, 10); setLineItems(n); }} />
              <TextField label={moneyLabel('Cost')} type="number" size="small" sx={{ width: 100 }} value={item.unit_cost} onChange={(e) => { const n = [...lineItems]; n[idx].unit_cost = parseFloat(e.target.value); setLineItems(n); }} />
              <IconButton color="error" onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}><Delete /></IconButton>
            </Box>
          </Grid>
        ))}
        <Grid item xs={12}><Button size="small" onClick={() => setLineItems([...lineItems, { product_id: '', quantity: 1, unit_cost: 0 }])}>Add line</Button></Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle2" align="right">Estimated Total: {formatMoney(totalValue)}</Typography>
        </Grid>
      </FormDialog>
    </>
  );
}
