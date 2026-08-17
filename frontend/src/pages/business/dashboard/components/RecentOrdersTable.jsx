import { ActionIcon, Badge, Group, Tooltip } from '@mantine/core';
import { Visibility, Print, Replay } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import DashboardSection from './DashboardSection';
import DataTable from '../../../../components/DataTable';
import { formatDisplayText } from '../../../../utils/displayText';

const statusColors = {
  pending: 'yellow',
  paid: 'green',
  completed: 'green',
  cancelled: 'red',
  on_hold: 'blue',
  refunded: 'gray',
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
        <Badge size="sm" color={statusColors[row.status] || 'gray'}>
          {formatDisplayText(row.status)}
        </Badge>
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
        <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
          <Tooltip label="View">
            <ActionIcon size="sm" variant="subtle" onClick={() => navigate(`/orders/${row.id}`)}>
              <Visibility fontSize="small" />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Print">
            <ActionIcon size="sm" variant="subtle" onClick={() => window.open(`/orders/${row.id}`, '_blank')}>
              <Print fontSize="small" />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Refund">
            <ActionIcon size="sm" variant="subtle" onClick={() => navigate(`/orders/${row.id}?tab=returns`)}>
              <Replay fontSize="small" />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    },
  ];

  return (
    <DashboardSection
      title="Recent Orders"
      subtitle="Latest transactions"
      loading={loading}
      error={error}
      onRetry={onRetry}
      noPadding
    >
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
