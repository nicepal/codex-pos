import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Grid, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Button, Divider, MenuItem, TextField,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import api from '../../services/api';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';

const statusColors = { pending: 'warning', paid: 'success', completed: 'success', cancelled: 'error', on_hold: 'info', refunded: 'default' };

export default function OrderDetailPage() {
  const { formatMoney } = useBusinessCurrency();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data.data),
  });

  const statusMutation = useMutation({
    mutationFn: (status) => api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries(['order', id]),
  });

  if (isLoading) return <Typography>Loading...</Typography>;
  if (!order) return <Typography>Order not found</Typography>;

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/orders')} sx={{ mb: 2 }}>Back to Orders</Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{order.order_number}</Typography>
          <Typography color="text.secondary">{new Date(order.created_at).toLocaleString()}</Typography>
        </Box>
        <Chip label={order.status} color={statusColors[order.status] || 'default'} />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Order Items</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(order.items || []).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>{item.sku || '-'}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{formatMoney(item.unit_price)}</TableCell>
                      <TableCell align="right">{formatMoney(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                <Typography>Subtotal: {formatMoney(order.subtotal)}</Typography>
                <Typography>Tax: {formatMoney(order.tax_amount)}</Typography>
                <Typography>Discount: -{formatMoney(order.discount_amount)}</Typography>
                <Typography variant="h6" fontWeight={700}>Total: {formatMoney(order.total_amount)}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Payment</Typography>
              <Typography><strong>Method:</strong> {order.payment_method || 'N/A'}</Typography>
              <Typography><strong>Status:</strong> {order.payment_status}</Typography>
              <Typography><strong>Type:</strong> {order.order_type?.toUpperCase()}</Typography>
            </CardContent>
          </Card>

          {order.customer && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Customer</Typography>
                <Typography>{order.customer.name}</Typography>
                <Typography variant="body2" color="text.secondary">{order.customer.email}</Typography>
                <Typography variant="body2" color="text.secondary">{order.customer.phone}</Typography>
                <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(`/customers/${order.customer.id}`)}>View Customer</Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Update Status</Typography>
              <TextField
                select fullWidth size="small" defaultValue={order.status}
                onChange={(e) => statusMutation.mutate(e.target.value)}
              >
                {['pending', 'paid', 'completed', 'cancelled', 'refunded', 'on_hold'].map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
              {order.notes && (
                <Typography variant="body2" sx={{ mt: 2 }}><strong>Notes:</strong> {order.notes}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
