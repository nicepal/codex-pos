import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Chip, Grid, TextField, MenuItem, Typography, IconButton } from '@mui/material';
import { Add, Delete, Visibility } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import { emptyPresetProps } from '../../utils/emptyStatePresets';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';

const empty = emptyPresetProps('purchaseOrders');

export default function PurchaseOrdersPage() {
  const { formatMoney } = useBusinessCurrency();
  const [open, setOpen] = useState(false);
  const [lineItems, setLineItems] = useState([{ product_id: '', quantity: 1, unit_cost: 0 }]);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { register, handleSubmit, reset } = useForm();

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
    onSuccess: () => { queryClient.invalidateQueries(['purchase-orders']); setOpen(false); reset(); setLineItems([{ product_id: '', quantity: 1, unit_cost: 0 }]); },
  });

  const receiveMutation = useMutation({
    mutationFn: (id) => api.post(`/purchase-orders/${id}/receive`),
    onSuccess: () => queryClient.invalidateQueries(['purchase-orders']),
  });

  const columns = [
    { field: 'po_number', label: 'PO #' },
    { field: 'supplier_name', label: 'Supplier' },
    { field: 'status', label: 'Status', render: (r) => <Chip label={r.status} size="small" /> },
    { field: 'total_amount', label: 'Total', align: 'right', render: (r) => formatMoney(r.total_amount) },
    { field: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString() },
    {
      field: 'actions', label: 'Actions',
      render: (r) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {r.status === 'ordered' && <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); receiveMutation.mutate(r.id); }}>Receive</Button>}
        </Box>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Purchase Orders" subtitle="Order stock from suppliers" actionLabel="New PO" actionIcon={<Add />} onAction={() => setOpen(true)} />
      <DataTable columns={columns} rows={data?.data || []} loading={isLoading} onEmptyAction={() => setOpen(true)} emptyActionIcon={<Add />} {...empty} />

      <FormDialog open={open} title="Create Purchase Order" onClose={() => setOpen(false)} onSubmit={handleSubmit((d) => createMutation.mutate({ ...d, items: lineItems.filter((i) => i.product_id) }))} loading={createMutation.isPending} submitLabel="Create" maxWidth="md">
        <Grid item xs={12}>
          <TextField fullWidth select label="Supplier" {...register('supplier_id', { required: true })} defaultValue="">
            <MenuItem value="">Select supplier</MenuItem>
            {(suppliers || []).map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
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
              <TextField label="Cost" type="number" size="small" sx={{ width: 100 }} value={item.unit_cost} onChange={(e) => { const n = [...lineItems]; n[idx].unit_cost = parseFloat(e.target.value); setLineItems(n); }} />
              <IconButton color="error" onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}><Delete /></IconButton>
            </Box>
          </Grid>
        ))}
        <Grid item xs={12}><Button size="small" onClick={() => setLineItems([...lineItems, { product_id: '', quantity: 1, unit_cost: 0 }])}>Add line</Button></Grid>
      </FormDialog>
    </>
  );
}
