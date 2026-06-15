import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Grid, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Button, Paper, TableContainer, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import api from '../../services/api';
import LoadingState from '../../components/LoadingState';
import StatCard from '../../components/StatCard';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';

const statusColors = { pending: 'warning', paid: 'success', completed: 'success', cancelled: 'error' };

export default function CustomerDetailPage() {
  const { formatMoney } = useBusinessCurrency();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState('');

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get(`/customers/${id}/detail`).then((r) => r.data.data),
  });

  const { data: loyaltyHistory } = useQuery({
    queryKey: ['loyalty', id],
    queryFn: () => api.get(`/customers/${id}/loyalty`).then((r) => r.data.data),
    enabled: !!id,
  });

  const redeemMutation = useMutation({
    mutationFn: (points) => api.post(`/customers/${id}/loyalty/redeem`, { points }),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer', id]);
      queryClient.invalidateQueries(['loyalty', id]);
      setRedeemOpen(false);
      setRedeemPoints('');
    },
  });

  if (isLoading) return <LoadingState />;
  if (!customer) return <Typography>Customer not found</Typography>;

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/customers')} sx={{ mb: 2 }}>Back to Customers</Button>

      <Typography variant="h5" fontWeight={700} gutterBottom>{customer.name}</Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard title="Total Orders" value={customer.stats?.total_orders || 0} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard title="Total Spent" value={formatMoney(customer.stats?.total_spent || 0)} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard title="Loyalty Points" value={customer.loyalty_points} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Contact Info</Typography>
              <Typography><strong>Email:</strong> {customer.email || '-'}</Typography>
              <Typography><strong>Phone:</strong> {customer.phone || '-'}</Typography>
              <Typography sx={{ mt: 1 }}><strong>Address:</strong></Typography>
              <Typography variant="body2" color="text.secondary">{customer.address || 'No address'}</Typography>
              <Typography sx={{ mt: 2 }}><strong>Credit Balance:</strong> {formatMoney(customer.credit_balance)}</Typography>
              {customer.notes && <Typography sx={{ mt: 2 }} variant="body2"><strong>Notes:</strong> {customer.notes}</Typography>}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Loyalty Program</Typography>
                <Button size="small" variant="outlined" onClick={() => setRedeemOpen(true)} disabled={!customer.loyalty_points}>
                  Redeem
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>Current balance: {customer.loyalty_points} points</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Points</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(loyaltyHistory || []).slice(0, 5).map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell><Chip label={tx.transaction_type} size="small" color={tx.transaction_type === 'earn' ? 'success' : 'warning'} /></TableCell>
                      <TableCell align="right">{tx.points > 0 ? `+${tx.points}` : tx.points}</TableCell>
                      <TableCell>{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {!loyaltyHistory?.length && (
                    <TableRow><TableCell colSpan={3} align="center">No loyalty activity</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Typography variant="h6" gutterBottom>Purchase History</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Order #</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(customer.orders || []).map((o) => (
                  <TableRow key={o.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/orders/${o.id}`)}>
                    <TableCell>{o.order_number}</TableCell>
                    <TableCell><Chip label={o.status} size="small" color={statusColors[o.status] || 'default'} /></TableCell>
                    <TableCell>{o.payment_method || '-'}</TableCell>
                    <TableCell align="right">{formatMoney(o.total_amount)}</TableCell>
                    <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {!customer.orders?.length && (
                  <TableRow><TableCell colSpan={5} align="center">No orders yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      <Dialog open={redeemOpen} onClose={() => setRedeemOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Redeem Loyalty Points</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Points to redeem"
            type="number"
            value={redeemPoints}
            onChange={(e) => setRedeemPoints(e.target.value)}
            inputProps={{ min: 1, max: customer.loyalty_points }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRedeemOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={redeemMutation.isPending || !redeemPoints || parseInt(redeemPoints, 10) > customer.loyalty_points}
            onClick={() => redeemMutation.mutate(parseInt(redeemPoints, 10))}
          >
            Redeem
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
