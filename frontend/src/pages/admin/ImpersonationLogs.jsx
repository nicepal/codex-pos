import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';

export default function ImpersonationLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['impersonation-logs'],
    queryFn: () => api.get('/audit-logs/impersonation').then((r) => r.data),
  });

  const columns = [
    { field: 'admin_email', label: 'Admin' },
    { field: 'tenant_name', label: 'Business' },
    { field: 'ip_address', label: 'IP' },
    { field: 'started_at', label: 'Started', render: (r) => new Date(r.started_at).toLocaleString() },
  ];

  return (
    <>
      <PageHeader title="Impersonation Logs" subtitle="Track admin impersonation sessions" />
      <DataTable columns={columns} rows={data?.data || []} loading={isLoading} emptyTitle="No impersonation logs" />
    </>
  );
}
