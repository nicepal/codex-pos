import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Grid, Typography, Button, TextField, MenuItem, Chip,
} from '@mui/material';
import { Add, Remove, Tune } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatCard from '../../components/StatCard';
import FormDialog from '../../components/FormDialog';
import RHFTextField from '../../components/RHFTextField';
import { emptyPresetProps } from '../../utils/emptyStatePresets';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';

const emptyInventory = emptyPresetProps('inventory');
const emptyTransactions = emptyPresetProps('transactions');

const STOCK_ACTIONS = {
  'stock-in': { title: 'Stock In', icon: <Add />, endpoint: '/inventory/stock-in', label: 'Add stock' },
  'stock-out': { title: 'Stock Out', icon: <Remove />, endpoint: '/inventory/stock-out', label: 'Remove stock' },
  adjustment: { title: 'Adjust Stock', icon: <Tune />, endpoint: '/inventory/adjustment', label: 'Set adjustment' },
};

export default function InventoryPage() {
  const { formatMoney } = useBusinessCurrency();
  const [action, setAction] = useState(null);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data: lowStock, isLoading: lowStockLoading } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => api.get('/inventory/low-stock').then((r) => r.data.data),
  });

  const { data: report } = useQuery({
    queryKey: ['inventory-report'],
    queryFn: () => api.get('/reports/inventory').then((r) => r.data.data),
  });

  const { data: products } = useQuery({
    queryKey: ['products-list-inv'],
    queryFn: () => api.get('/products', { params: { limit: 500 } }).then((r) => r.data.data),
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['inventory-transactions'],
    queryFn: () => api.get('/inventory', { params: { limit: 20 } }).then((r) => r.data),
  });

  const stockMutation = useMutation({
    mutationFn: ({ endpoint, payload }) => api.post(endpoint, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['low-stock']);
      queryClient.invalidateQueries(['inventory-report']);
      queryClient.invalidateQueries(['inventory-transactions']);
      queryClient.invalidateQueries(['products']);
      setAction(null);
      reset();
    },
  });

  const openAction = (type) => {
    setAction(type);
    reset({ product_id: '', quantity: '', notes: '' });
  };

  const lowStockColumns = [
    { field: 'name', label: 'Product' },
    { field: 'sku', label: 'SKU', render: (r) => r.sku || '-' },
    { field: 'stock_quantity', label: 'Current Stock' },
    { field: 'low_stock_threshold', label: 'Threshold' },
    { field: 'status', label: 'Status', render: () => <Chip label="Low Stock" color="warning" size="small" /> },
  ];

  const txColumns = [
    { field: 'transaction_type', label: 'Type', render: (r) => <Chip label={r.transaction_type} size="small" /> },
    { field: 'quantity', label: 'Qty' },
    { field: 'previous_quantity', label: 'Before' },
    { field: 'new_quantity', label: 'After' },
    { field: 'notes', label: 'Notes', render: (r) => r.notes || '-' },
    { field: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleString() },
  ];

  return (
    <Box>
      <PageHeader
        title="Inventory Management"
        subtitle="Monitor stock levels and record adjustments"
        action={(
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Object.entries(STOCK_ACTIONS).map(([key, cfg]) => (
              <Button key={key} variant="outlined" startIcon={cfg.icon} onClick={() => openAction(key)}>{cfg.title}</Button>
            ))}
          </Box>
        )}
      />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard title="Total Products" value={report?.summary?.product_count || 0} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard title="Total Units" value={report?.summary?.total_units || 0} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard title="Inventory Value" value={formatMoney(report?.summary?.total_value || 0)} />
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom>Low Stock Alerts</Typography>
      <DataTable
        columns={lowStockColumns}
        rows={lowStock || []}
        loading={lowStockLoading}
        {...emptyInventory}
      />

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Recent Transactions</Typography>
      <DataTable columns={txColumns} rows={transactions?.data || []} loading={txLoading} {...emptyTransactions} />

      <FormDialog
        open={!!action}
        title={action ? STOCK_ACTIONS[action].title : ''}
        onClose={() => setAction(null)}
        onSubmit={handleSubmit((d) => stockMutation.mutate({
          endpoint: STOCK_ACTIONS[action].endpoint,
          payload: { product_id: d.product_id, quantity: parseInt(d.quantity, 10), notes: d.notes },
        }))}
        loading={stockMutation.isPending}
        submitLabel={action ? STOCK_ACTIONS[action].label : 'Save'}
      >
        <Grid item xs={12}>
          <RHFTextField register={register} name="product_id" rules={{ required: true }} select label="Product" defaultValue="">
            <MenuItem value="">Select product</MenuItem>
            {(products || []).map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name} (stock: {p.stock_quantity})</MenuItem>
            ))}
          </RHFTextField>
        </Grid>
        <Grid item xs={12}>
          <RHFTextField register={register} name="quantity" rules={{ required: true }} label="Quantity" type="number" inputProps={{ min: 1 }} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Notes" multiline rows={2} {...register('notes')} />
        </Grid>
      </FormDialog>
    </Box>
  );
}
