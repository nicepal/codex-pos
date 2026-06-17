import { Chip, IconButton, Tooltip, Box } from '@mui/material';
import { Visibility, Print, Replay } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import DashboardSection from './DashboardSection';
import DataTable from '../../../../components/DataTable';
import { formatDisplayText } from '../../../../utils/displayText';

const statusColors = {
  pending: 'warning',
  paid: 'success',
  completed: 'success',
  cancelled: 'error',
  on_hold: 'info',
  refunded: 'default',
};

export default function RecentOrdersTable({ orders, formatMoney, loading, error, onRetry }) {
  const navigate = useNavigate();

  const columns = [
    { id: 'orderNumber', label: 'Invoice #', field: 'orderNumber' },
    { id: 'customerName', label: 'Customer', field: 'customerName' },
    {
      id: 'totalAmount',
      label: 'Amount',
      render: (row) => formatMoney(row.totalAmount),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => (
        <Chip label={formatDisplayText(row.status)} size="small" color={statusColors[row.status] || 'default'} />
      ),
    },
    {
      id: 'createdAt',
      label: 'Date',
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/orders/${row.id}`); }}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Print">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); window.open(`/orders/${row.id}`, '_blank'); }}>
              <Print fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refund">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/orders/${row.id}?tab=returns`); }}>
              <Replay fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <DashboardSection title="Recent Orders" subtitle="Latest transactions" loading={loading} error={error} onRetry={onRetry} noPadding>
      <DataTable
        columns={columns}
        rows={orders || []}
        loading={loading}
        emptyTitle="No orders yet"
        emptyMessage="Your recent orders will appear here."
        emptyActionLabel="New Sale"
        onEmptyAction={() => navigate('/pos')}
        onRowClick={(row) => navigate(`/orders/${row.id}`)}
        stickyHeader={false}
      />
    </DashboardSection>
  );
}
