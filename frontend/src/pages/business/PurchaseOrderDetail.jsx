import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell, TableHead, TableRow, Chip,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import api from '../../services/api';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatMoney } = useBusinessCurrency();
  const queryClient = useQueryClient();

  const { data: po, isLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => api.get(`/purchase-orders/${id}`).then((r) => r.data.data),
  });

  const receiveMutation = useMutation({
    mutationFn: () => api.post(`/purchase-orders/${id}/receive`),
    onSuccess: () => queryClient.invalidateQueries(['purchase-order', id]),
  });

  if (isLoading) return <Typography>Loading...</Typography>;
  if (!po) return <Typography>PO not found</Typography>;

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/purchase-orders')} sx={{ mb: 2 }}>Back</Button>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>{po.po_number}</Typography>
        <Chip label={po.status} />
      </Box>
      <Typography color="text.secondary" gutterBottom>Supplier: {po.supplier_name || '—'}</Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Unit cost</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(po.items || []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">{formatMoney(item.unit_cost)}</TableCell>
                  <TableCell align="right">{formatMoney(item.total_cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography align="right" fontWeight={700} sx={{ mt: 2 }}>Total: {formatMoney(po.total_amount)}</Typography>
        </CardContent>
      </Card>
      {po.status !== 'received' && (
        <Button variant="contained" onClick={() => receiveMutation.mutate()} disabled={receiveMutation.isPending}>
          Receive & Update Stock
        </Button>
      )}
    </Box>
  );
}
