import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Grid, Card, CardContent, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Button, Divider, MenuItem, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControlLabel, Checkbox, Alert,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import api from '../../services/api';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import useTenantFeatures from '../../hooks/useTenantFeatures';
import { formatDisplayText } from '../../utils/displayText';

const statusColors = { pending: 'warning', paid: 'success', completed: 'success', cancelled: 'error', on_hold: 'info', refunded: 'default' };

export default function OrderDetailPage() {
  const { formatMoney } = useBusinessCurrency();
  const { hasFeature } = useTenantFeatures();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnItems, setReturnItems] = useState({});
  const [returnError, setReturnError] = useState('');
  const [restock, setRestock] = useState(true);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data.data),
  });

  const statusMutation = useMutation({
    mutationFn: (status) => api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries(['order', id]),
  });

  const returnMutation = useMutation({
    mutationFn: (payload) => api.post(`/orders/${id}/return`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['order', id]);
      setReturnOpen(false);
      setReturnError('');
    },
    onError: (err) => setReturnError(err.response?.data?.message || 'Return failed'),
  });

  const openReturn = () => {
    const init = {};
    (order?.items || []).forEach((item) => { init[item.id] = 0; });
    setReturnItems(init);
    setReturnOpen(true);
  };

  const submitReturn = () => {
    const items = Object.entries(returnItems)
      .filter(([, qty]) => parseInt(qty, 10) > 0)
      .map(([order_item_id, quantity]) => ({ order_item_id, quantity: parseInt(quantity, 10) }));
    if (!items.length) {
      setReturnError('Select at least one item to return');
      return;
    }
    returnMutation.mutate({ items, restock });
  };

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
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {hasFeature('pos_pro') && ['paid', 'completed'].includes(order.status) && (
            <Button variant="outlined" onClick={openReturn}>Process Return</Button>
          )}
          <Chip label={formatDisplayText(order.status)} color={statusColors[order.status] || 'default'} />
        </Box>
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
                    <TableCell align="right">Discount</TableCell>
                    <TableCell align="right">Tax</TableCell>
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
                      <TableCell align="right">-{formatMoney(item.discount || 0)}</TableCell>
                      <TableCell align="right">{formatMoney(item.tax || 0)}</TableCell>
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
              <Typography><strong>Method:</strong> {formatDisplayText(order.payment_method) || 'N/A'}</Typography>
              <Typography><strong>Status:</strong> {formatDisplayText(order.payment_status) || '—'}</Typography>
              <Typography><strong>Type:</strong> {formatDisplayText(order.order_type) || '—'}</Typography>
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
                  <MenuItem key={s} value={s}>{formatDisplayText(s)}</MenuItem>
                ))}
              </TextField>
              {order.notes && (
                <Typography variant="body2" sx={{ mt: 2 }}><strong>Notes:</strong> {order.notes}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={returnOpen} onClose={() => setReturnOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Process Return</DialogTitle>
        <DialogContent>
          {returnError && <Alert severity="error" sx={{ mb: 2 }}>{returnError}</Alert>}
          {(order.items || []).map((item) => (
            <TextField
              key={item.id}
              fullWidth
              type="number"
              label={`${item.product_name} (max ${item.quantity})`}
              sx={{ mt: 2 }}
              inputProps={{ min: 0, max: item.quantity }}
              value={returnItems[item.id] ?? 0}
              onChange={(e) => setReturnItems({ ...returnItems, [item.id]: e.target.value })}
            />
          ))}
          <FormControlLabel
            control={<Checkbox checked={restock} onChange={(e) => setRestock(e.target.checked)} />}
            label="Restock returned items"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitReturn} disabled={returnMutation.isPending}>Submit Return</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
