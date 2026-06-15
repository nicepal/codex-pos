import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Chip, Button } from '@mui/material';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';

export default function AffiliatesPage() {
  const [selectedId, setSelectedId] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['affiliates'],
    queryFn: () => api.get('/affiliates').then((r) => r.data.data),
  });

  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ['affiliate-commissions', selectedId],
    queryFn: () => api.get(`/affiliates/${selectedId}/commissions`).then((r) => r.data.data),
    enabled: !!selectedId,
  });

  const approve = useMutation({
    mutationFn: ({ affiliateId, commissionId }) => api.post(`/affiliates/${affiliateId}/commissions/${commissionId}/approve`),
    onSuccess: () => queryClient.invalidateQueries(['affiliate-commissions', selectedId]),
  });

  const pay = useMutation({
    mutationFn: ({ affiliateId, commissionId }) => api.post(`/affiliates/${affiliateId}/commissions/${commissionId}/pay`),
    onSuccess: () => queryClient.invalidateQueries(['affiliate-commissions', selectedId]),
  });

  const affiliateColumns = [
    { field: 'referral_code', label: 'Code' },
    { field: 'user', label: 'User', render: (r) => r.email || `${r.first_name} ${r.last_name}` },
    { field: 'total_referrals', label: 'Referrals' },
    { field: 'total_earnings', label: 'Earnings', render: (r) => `$${Number(r.total_earnings).toFixed(2)}` },
    { field: 'pending_payout', label: 'Pending', render: (r) => `$${Number(r.pending_payout).toFixed(2)}` },
    {
      field: 'actions', label: 'Actions',
      render: (r) => <Button size="small" onClick={() => setSelectedId(r.id)}>Commissions</Button>,
    },
  ];

  const commissionColumns = [
    { field: 'tenant_name', label: 'Business', render: (r) => r.tenant_name || '-' },
    { field: 'amount', label: 'Amount', render: (r) => `$${Number(r.amount).toFixed(2)}` },
    { field: 'status', label: 'Status', render: (r) => <Chip label={r.status} size="small" /> },
    {
      field: 'actions', label: 'Actions',
      render: (r) => (
        <>
          {r.status === 'pending' && <Button size="small" onClick={() => approve.mutate({ affiliateId: selectedId, commissionId: r.id })}>Approve</Button>}
          {r.status === 'approved' && <Button size="small" color="success" onClick={() => pay.mutate({ affiliateId: selectedId, commissionId: r.id })}>Pay</Button>}
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Affiliate Program" subtitle="Referral partners and commission payouts" />
      <DataTable columns={affiliateColumns} rows={data || []} loading={isLoading} emptyTitle="No affiliates" />

      {selectedId && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>Commissions</Typography>
          <DataTable columns={commissionColumns} rows={commissions || []} loading={commissionsLoading} emptyTitle="No commissions" />
        </Box>
      )}
    </Box>
  );
}
