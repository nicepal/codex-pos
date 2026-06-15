import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Chip } from '@mui/material';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';

const priorityColors = { low: 'default', medium: 'info', high: 'warning', critical: 'error' };

export default function TicketsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: () => api.get('/tickets', { params: { all: true } }).then((r) => r.data),
  });

  const columns = [
    { field: 'ticket_number', label: 'Ticket #' },
    { field: 'tenant_name', label: 'Business', render: (r) => r.tenant_name || '-' },
    { field: 'subject', label: 'Subject' },
    { field: 'priority', label: 'Priority', render: (r) => <Chip label={r.priority} size="small" color={priorityColors[r.priority]} /> },
    { field: 'status', label: 'Status' },
    { field: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString() },
  ];

  return (
    <>
      <PageHeader title="Support Tickets" subtitle="Customer support requests across tenants" />
      <DataTable
        columns={columns}
        rows={data?.data || []}
        loading={isLoading}
        onRowClick={(r) => navigate(`/admin/tickets/${r.id}`)}
        emptyTitle="No tickets"
        emptyMessage="Support tickets from businesses will appear here"
      />
    </>
  );
}
