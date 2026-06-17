import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Chip, IconButton, Rating, Tabs, Tab, Typography, Tooltip,
} from '@mui/material';
import { Check, Close, Delete } from '@mui/icons-material';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';

const STATUS_TABS = ['pending', 'approved', 'rejected'];

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [deleteId, setDeleteId] = useState(null);
  const status = STATUS_TABS[tab];

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', status],
    queryFn: () => api.get('/reviews', { params: { status, limit: 100 } }).then((r) => r.data),
  });

  const moderateMutation = useMutation({
    mutationFn: ({ id, newStatus }) => api.patch(`/reviews/${id}`, { status: newStatus }),
    onSuccess: () => queryClient.invalidateQueries(['reviews']),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/reviews/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['reviews']); setDeleteId(null); },
  });

  const columns = [
    { field: 'product_name', label: 'Product', render: (r) => <strong>{r.product_name}</strong> },
    { field: 'rating', label: 'Rating', render: (r) => <Rating value={r.rating} size="small" readOnly /> },
    {
      field: 'review',
      label: 'Review',
      render: (r) => (
        <Box>
          {r.title && <Typography variant="body2" fontWeight={600}>{r.title}</Typography>}
          <Typography variant="body2" color="text.secondary">{r.body}</Typography>
        </Box>
      ),
    },
    {
      field: 'author_name',
      label: 'Author',
      render: (r) => (
        <Box>
          {r.author_name}
          {r.verified_purchase && <Chip size="small" label="Verified" color="success" sx={{ ml: 1 }} />}
        </Box>
      ),
    },
    { field: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString() },
    {
      field: 'actions',
      label: 'Actions',
      render: (r) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {r.status !== 'approved' && (
            <Tooltip title="Approve">
              <IconButton size="small" color="success" onClick={() => moderateMutation.mutate({ id: r.id, newStatus: 'approved' })}>
                <Check fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {r.status !== 'rejected' && (
            <Tooltip title="Reject">
              <IconButton size="small" color="warning" onClick={() => moderateMutation.mutate({ id: r.id, newStatus: 'rejected' })}>
                <Close fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => setDeleteId(r.id)}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Reviews" subtitle="Moderate customer product reviews from your storefront" />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Pending" />
        <Tab label="Approved" />
        <Tab label="Rejected" />
      </Tabs>

      <DataTable
        columns={columns}
        rows={data?.data || []}
        loading={isLoading}
        emptyTitle={`No ${status} reviews`}
        emptyMessage={status === 'pending' ? 'New reviews from your storefront will appear here for approval.' : `No ${status} reviews yet.`}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Review"
        message="Permanently delete this review?"
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
        danger
        confirmLabel="Delete"
      />
    </Box>
  );
}
