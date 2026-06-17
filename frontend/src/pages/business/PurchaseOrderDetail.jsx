import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell, TableHead, TableRow, Chip, TextField, Stack, Alert,
} from '@mui/material';
import { ArrowBack, LocalShipping, Cancel, DeleteOutline, PictureAsPdf } from '@mui/icons-material';
import api from '../../services/api';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import LoadingState from '../../components/LoadingState';
import { downloadBlob, fileNameFromDisposition } from '../../utils/fileDownload';
import { formatDisplayText } from '../../utils/displayText';
import useTenantFeatures from '../../hooks/useTenantFeatures';

export default function PurchaseOrderDetailPage() {
  const { hasFeature } = useTenantFeatures();
  const inventoryPro = hasFeature('inventory_pro');
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatMoney } = useBusinessCurrency();
  const queryClient = useQueryClient();
  const [receiveQty, setReceiveQty] = useState({});

  const { data: po, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => api.get(`/purchase-orders/${id}`).then((r) => r.data.data),
  });

  const pendingItems = useMemo(
    () => (po?.items || []).map((item) => {
      const received = item.received_quantity || 0;
      return { ...item, pending: Math.max(0, item.quantity - received) };
    }),
    [po?.items]
  );
  const hasPending = pendingItems.some((i) => i.pending > 0);

  const receiveMutation = useMutation({
    mutationFn: (payload) => api.post(`/purchase-orders/${id}/receive`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['purchase-order', id]);
      queryClient.invalidateQueries(['purchase-orders']);
      setReceiveQty({});
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status) => api.patch(`/purchase-orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['purchase-order', id]);
      queryClient.invalidateQueries(['purchase-orders']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/purchase-orders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['purchase-orders']);
      navigate('/purchase-orders');
    },
  });

  const downloadPdfMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get(`/purchase-orders/${id}/pdf`, { responseType: 'blob' });
      const fallbackName = `PO-${(po?.po_number || id).replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
      const disposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
      const fileName = fileNameFromDisposition(disposition, fallbackName);
      downloadBlob(response.data, fileName);
    },
  });

  const receiveAll = () => receiveMutation.mutate({});
  const receivePartial = () => {
    const items = pendingItems
      .filter((item) => (parseInt(receiveQty[item.id], 10) || 0) > 0)
      .map((item) => ({ id: item.id, quantity: parseInt(receiveQty[item.id], 10) || 0 }));
    receiveMutation.mutate({ items });
  };

  const mutationError = receiveMutation.error || updateStatusMutation.error || deleteMutation.error || downloadPdfMutation.error;
  const mutationErrorMsg = mutationError?.response?.data?.message || mutationError?.message;

  if (isLoading) return <LoadingState message="Loading purchase order..." />;
  if (isError) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/purchase-orders')} sx={{ mb: 2 }}>Back</Button>
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => refetch()}>Retry</Button>}>
          {error?.response?.data?.message || error?.message || 'Failed to load purchase order'}
        </Alert>
      </Box>
    );
  }
  if (!po) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/purchase-orders')} sx={{ mb: 2 }}>Back</Button>
        <Typography>PO not found</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/purchase-orders')} sx={{ mb: 2 }}>Back</Button>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>{po.po_number}</Typography>
        <Chip label={formatDisplayText(po.status)} color={po.status === 'received' ? 'success' : po.status === 'cancelled' ? 'error' : po.status === 'ordered' ? 'info' : 'default'} />
      </Box>
      <Typography color="text.secondary" gutterBottom>Supplier: {po.supplier_name || '—'}</Typography>

      {mutationErrorMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => { receiveMutation.reset(); updateStatusMutation.reset(); deleteMutation.reset(); }}>
          {mutationErrorMsg}
        </Alert>
      )}

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Button
          startIcon={<PictureAsPdf />}
          variant="contained"
          onClick={() => downloadPdfMutation.mutate()}
          disabled={downloadPdfMutation.isPending}
        >
          {downloadPdfMutation.isPending ? 'Generating PDF...' : 'Download PDF'}
        </Button>
        {po.status === 'draft' && (
          <Button startIcon={<LocalShipping />} variant="outlined" onClick={() => updateStatusMutation.mutate('ordered')} disabled={updateStatusMutation.isPending}>
            Mark Ordered
          </Button>
        )}
        {(po.status === 'draft' || po.status === 'ordered') && (
          <Button startIcon={<Cancel />} variant="outlined" color="warning" onClick={() => updateStatusMutation.mutate('cancelled')} disabled={updateStatusMutation.isPending}>
            Cancel PO
          </Button>
        )}
        {po.status === 'draft' && (
          <Button startIcon={<DeleteOutline />} variant="outlined" color="error" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
            Delete Draft
          </Button>
        )}
      </Stack>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Received</TableCell>
                <TableCell align="right">Pending</TableCell>
                <TableCell align="right">Receive now</TableCell>
                <TableCell align="right">Unit cost</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">{item.received_quantity || 0}</TableCell>
                  <TableCell align="right">{item.pending}</TableCell>
                  <TableCell align="right">
                    {po.status === 'ordered' && item.pending > 0 ? (
                      <TextField
                        type="number"
                        size="small"
                        value={receiveQty[item.id] ?? ''}
                        onChange={(e) => setReceiveQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        inputProps={{ min: 0, max: item.pending, style: { textAlign: 'right', width: 70 } }}
                      />
                    ) : '—'}
                  </TableCell>
                  <TableCell align="right">{formatMoney(item.unit_cost)}</TableCell>
                  <TableCell align="right">{formatMoney(item.total_cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography align="right" fontWeight={700} sx={{ mt: 2 }}>Total: {formatMoney(po.total_amount)}</Typography>
        </CardContent>
      </Card>
      {po.status === 'ordered' && hasPending && !inventoryPro && (
        <Alert severity="info">PO receiving requires Inventory Pro. Enable it in Settings.</Alert>
      )}
      {po.status === 'ordered' && hasPending && inventoryPro && (
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={receiveAll} disabled={receiveMutation.isPending}>
            Receive All Pending
          </Button>
          <Button variant="outlined" onClick={receivePartial} disabled={receiveMutation.isPending}>
            Receive Selected Quantities
          </Button>
        </Stack>
      )}
    </Box>
  );
}
