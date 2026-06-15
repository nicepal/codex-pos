import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';

export default function AuditLogsPage() {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant_id') || '';

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', tenantId],
    queryFn: () => api.get('/audit-logs', {
      params: tenantId ? { tenant_id: tenantId } : undefined,
    }).then((r) => r.data),
  });

  const columns = [
    { field: 'created_at', label: 'Time', render: (r) => new Date(r.created_at).toLocaleString() },
    { field: 'user_email', label: 'User', render: (r) => r.user_email || '-' },
    { field: 'action', label: 'Action' },
    { field: 'entity_type', label: 'Entity' },
    { field: 'tenant_name', label: 'Tenant', render: (r) => r.tenant_name || '-' },
  ];

  return (
    <>
      <PageHeader
        title="Audit Logs"
        subtitle={tenantId ? 'Activity for this tenant' : 'Platform activity and change history'}
      />
      <DataTable columns={columns} rows={data?.data || []} loading={isLoading} emptyTitle="No audit logs" />
    </>
  );
}
