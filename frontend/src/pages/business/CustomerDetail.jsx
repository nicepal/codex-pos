import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Grid, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Button, Paper, TableContainer, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Autocomplete, FormControlLabel, Switch, Stack, Alert,
} from '@mui/material';
import { ArrowBack, MergeType, Save } from '@mui/icons-material';
import api from '../../services/api';
import LoadingState from '../../components/LoadingState';
import StatCard from '../../components/StatCard';
import ConfirmDialog from '../../components/ConfirmDialog';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import useTenantFeatures from '../../hooks/useTenantFeatures';
import { formatDisplayText } from '../../utils/displayText';
import { downloadBlob, fileNameFromDisposition } from '../../utils/fileDownload';

const statusColors = { pending: 'warning', paid: 'success', completed: 'success', cancelled: 'error' };

export default function CustomerDetailPage() {
  const { formatMoney } = useBusinessCurrency();
  const { hasFeature } = useTenantFeatures();
  const crmPro = hasFeature('crm_pro');
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState('');
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [taxExempt, setTaxExempt] = useState(false);
  const [profileError, setProfileError] = useState('');

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get(`/customers/${id}/detail`).then((r) => r.data.data),
  });

  useEffect(() => {
    if (!customer) return;
    setNotes(customer.notes || '');
    setTagsText((customer.tags || []).join(', '));
    setTaxExempt(!!customer.tax_exempt);
  }, [customer]);

  const { data: loyaltyHistory } = useQuery({
    queryKey: ['loyalty', id],
    queryFn: () => api.get(`/customers/${id}/loyalty`).then((r) => r.data.data),
    enabled: !!id && crmPro,
  });

  const { data: allCustomers } = useQuery({
    queryKey: ['customers-merge-list'],
    queryFn: () => api.get('/customers', { params: { limit: 200 } }).then((r) => r.data.data),
    enabled: mergeOpen && crmPro,
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

  const updateMutation = useMutation({
    mutationFn: (payload) => api.put(`/customers/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer', id]);
      setProfileError('');
    },
    onError: (err) => setProfileError(err.response?.data?.message || 'Update failed'),
  });

  const mergeMutation = useMutation({
    mutationFn: (mergeId) => api.post(`/customers/${id}/merge`, { merge_id: mergeId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer', id]);
      setMergeOpen(false);
      setMergeTarget(null);
    },
    onError: (err) => setProfileError(err.response?.data?.message || 'Merge failed'),
  });

  const gdprExportMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get(`/compliance/gdpr/customers/${id}/export`, { responseType: 'blob' });
      const disposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
      const fileName = fileNameFromDisposition(disposition, `customer-${id}.json`);
      downloadBlob(response.data, fileName);
    },
  });

  const gdprEraseMutation = useMutation({
    mutationFn: () => api.post(`/compliance/gdpr/customers/${id}/erase`),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer', id]);
      setEraseOpen(false);
    },
  });

  const saveProfile = () => {
    const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean);
    updateMutation.mutate({
      notes,
      tags,
      tax_exempt: taxExempt,
    });
  };

  if (isLoading) return <LoadingState />;
  if (!customer) return <Typography>Customer not found</Typography>;

  const mergeOptions = (allCustomers || []).filter((c) => c.id !== id);

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/customers')}>Back to Customers</Button>
        {crmPro && (
          <Button startIcon={<MergeType />} variant="outlined" onClick={() => setMergeOpen(true)}>
            Merge customer
          </Button>
        )}
        <Button variant="outlined" onClick={() => gdprExportMutation.mutate()} disabled={gdprExportMutation.isPending}>
          Export data (GDPR)
        </Button>
        <Button variant="outlined" color="error" onClick={() => setEraseOpen(true)}>
          Erase data
        </Button>
      </Stack>

      <Typography variant="h5" fontWeight={700} gutterBottom>{customer.name}</Typography>
      {(customer.tags || []).length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
          {customer.tags.map((tag) => <Chip key={tag} label={tag} size="small" />)}
        </Stack>
      )}

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

      {profileError && <Alert severity="error" sx={{ mb: 2 }}>{profileError}</Alert>}

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
            </CardContent>
          </Card>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>CRM Details</Typography>
              <TextField fullWidth label="Notes" multiline rows={3} value={notes}
                onChange={(e) => setNotes(e.target.value)} sx={{ mb: 2 }} />
              {crmPro && (
                <TextField fullWidth label="Tags (comma-separated)" value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)} sx={{ mb: 2 }} />
              )}
              {crmPro && hasFeature('tax_advanced') && (
                <FormControlLabel
                  control={<Switch checked={taxExempt} onChange={(e) => setTaxExempt(e.target.checked)} />}
                  label="Tax exempt"
                />
              )}
              <Button variant="contained" startIcon={<Save />} fullWidth sx={{ mt: 2 }}
                onClick={saveProfile} disabled={updateMutation.isPending}>
                Save details
              </Button>
            </CardContent>
          </Card>

          {crmPro && (
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
                        <TableCell><Chip label={formatDisplayText(tx.transaction_type)} size="small" color={tx.transaction_type === 'earn' ? 'success' : 'warning'} /></TableCell>
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
          )}
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
                    <TableCell><Chip label={formatDisplayText(o.status)} size="small" color={statusColors[o.status] || 'default'} /></TableCell>
                    <TableCell>{formatDisplayText(o.payment_method) || '-'}</TableCell>
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

      <Dialog open={mergeOpen} onClose={() => setMergeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Merge customer</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Merge another customer into <strong>{customer.name}</strong>. Orders and loyalty points will be combined; the other record will be deleted.
          </Typography>
          <Autocomplete
            options={mergeOptions}
            getOptionLabel={(o) => `${o.name}${o.email ? ` (${o.email})` : ''}`}
            value={mergeTarget}
            onChange={(_, v) => setMergeTarget(v)}
            renderInput={(params) => <TextField {...params} label="Customer to merge in" />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeOpen(false)}>Cancel</Button>
          <Button variant="contained" color="warning" disabled={!mergeTarget || mergeMutation.isPending}
            onClick={() => mergeMutation.mutate(mergeTarget.id)}>
            Merge
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={eraseOpen}
        title="Erase customer data"
        message="This anonymizes the customer's personal data (name, email, phone) to comply with a deletion request. Order/financial records are retained for accounting. This cannot be undone."
        onConfirm={() => gdprEraseMutation.mutate()}
        onCancel={() => setEraseOpen(false)}
        loading={gdprEraseMutation.isPending}
        danger
        confirmLabel="Erase data"
      />
    </Box>
  );
}
