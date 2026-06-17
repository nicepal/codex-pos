import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Chip, TextField, MenuItem, Alert } from '@mui/material';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import { emptyPresetProps } from '../../utils/emptyStatePresets';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import { formatDisplayText } from '../../utils/displayText';

const empty = emptyPresetProps('orders');

const statusColors = { pending: 'warning', paid: 'success', completed: 'success', cancelled: 'error', on_hold: 'info' };

export default function OrdersPage() {
  const { formatMoney } = useBusinessCurrency();
  const navigate = useNavigate();
  const [branchFilter, setBranchFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data: branches } = useQuery({
    queryKey: ['branches-filter'],
    queryFn: () => api.get('/branches').then((r) => r.data.data),
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['orders', branchFilter, page, limit],
    queryFn: () => api.get('/orders', {
      params: {
        branch_id: branchFilter || undefined,
        page,
        limit,
      },
    }).then((r) => r.data),
  });

  const columns = [
    { field: 'order_number', label: 'Order #' },
    { field: 'order_type', label: 'Type', render: (r) => formatDisplayText(r.order_type) || '—' },
    { field: 'status', label: 'Status', render: (r) => <Chip label={formatDisplayText(r.status)} size="small" color={statusColors[r.status] || 'default'} /> },
    { field: 'payment_method', label: 'Payment', render: (r) => formatDisplayText(r.payment_method) || '-' },
    { field: 'total_amount', label: 'Total', align: 'right', render: (r) => formatMoney(r.total_amount) },
    { field: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleString() },
  ];

  return (
    <>
      <PageHeader title="Orders" subtitle="View and manage sales orders" />
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => refetch()}>
          {error?.response?.data?.message || 'Failed to load orders'}
        </Alert>
      )}
      <Box sx={{ mb: 2 }}>
        <TextField select size="small" label="Branch" value={branchFilter} onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }} sx={{ minWidth: 180 }}>
          <MenuItem value="">All branches</MenuItem>
          {(branches || []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
        </TextField>
      </Box>
      <DataTable
        columns={columns}
        rows={data?.data || []}
        loading={isLoading}
        onRowClick={(r) => navigate(`/orders/${r.id}`)}
        {...empty}
        pagination={data?.pagination}
        onPageChange={setPage}
        onRowsPerPageChange={(value) => { setLimit(value); setPage(1); }}
      />
    </>
  );
}
