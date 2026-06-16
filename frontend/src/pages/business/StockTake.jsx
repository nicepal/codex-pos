import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, TextField, MenuItem, Grid, Card, CardContent, Alert,
  Chip, LinearProgress, InputAdornment, Stack, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  PlayArrow, CheckCircle, Cancel, Search, Save, Inventory2, History,
} from '@mui/icons-material';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import StatCard from '../../components/StatCard';
import EmptyState from '../../components/EmptyState';
import useTenantFeatures from '../../hooks/useTenantFeatures';

function varianceChip(expected, counted) {
  if (counted === '' || counted === null || counted === undefined) return null;
  const diff = parseInt(counted, 10) - parseInt(expected, 10);
  if (diff === 0) return <Chip label="Match" size="small" color="success" />;
  if (diff > 0) return <Chip label={`+${diff}`} size="small" color="info" />;
  return <Chip label={`${diff}`} size="small" color="warning" />;
}

const statusColors = { open: 'info', completed: 'success', cancelled: 'default' };

export default function StockTakePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasFeature } = useTenantFeatures();
  const inventoryPro = hasFeature('inventory_pro');

  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState({});
  const [startOpen, setStartOpen] = useState(false);
  const [branchId, setBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: openSession, isLoading: sessionLoading } = useQuery({
    queryKey: ['stock-take-open'],
    queryFn: () => api.get('/inventory/stock-take/open').then((r) => r.data.data),
    enabled: inventoryPro,
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['stock-take-history'],
    queryFn: () => api.get('/inventory/stock-take', { params: { limit: 10 } }).then((r) => r.data),
    enabled: inventoryPro,
  });

  const { data: products } = useQuery({
    queryKey: ['products-stock-take'],
    queryFn: () => api.get('/products', { params: { limit: 500, status: 'active' } }).then((r) => r.data.data),
    enabled: inventoryPro && !!openSession,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches-stock-take'],
    queryFn: () => api.get('/branches', { params: { limit: 100 } }).then((r) => r.data.data),
    enabled: inventoryPro && startOpen,
  });

  const sessionId = openSession?.id;
  const lineMap = useMemo(() => {
    const map = {};
    (openSession?.lines || []).forEach((line) => {
      map[line.product_id] = line;
    });
    return map;
  }, [openSession?.lines]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products || [];
    return (products || []).filter(
      (p) => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const countedCount = (openSession?.lines || []).length;
  const totalProducts = products?.length || 0;
  const progress = totalProducts > 0 ? Math.round((countedCount / totalProducts) * 100) : 0;

  const invalidateAll = () => {
    queryClient.invalidateQueries(['stock-take-open']);
    queryClient.invalidateQueries(['stock-take-history']);
    queryClient.invalidateQueries(['inventory-report']);
    queryClient.invalidateQueries(['low-stock']);
    queryClient.invalidateQueries(['products']);
  };

  const startMutation = useMutation({
    mutationFn: (payload) => api.post('/inventory/stock-take', payload),
    onSuccess: () => {
      setStartOpen(false);
      setBranchId('');
      setNotes('');
      setError('');
      setSuccess('Stock take session started — count your products below.');
      invalidateAll();
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to start stock take'),
  });

  const lineMutation = useMutation({
    mutationFn: ({ productId, countedQty }) => api.post(`/inventory/stock-take/${sessionId}/lines`, {
      product_id: productId,
      counted_qty: countedQty,
    }),
    onSuccess: () => {
      setSuccess('Count saved');
      setError('');
      invalidateAll();
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to save count'),
  });

  const completeMutation = useMutation({
    mutationFn: () => api.post(`/inventory/stock-take/${sessionId}/complete`),
    onSuccess: () => {
      setCompleteOpen(false);
      setCounts({});
      setSuccess('Stock take completed — inventory has been updated.');
      setError('');
      invalidateAll();
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to complete stock take');
      setCompleteOpen(false);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/inventory/stock-take/${sessionId}/cancel`),
    onSuccess: () => {
      setCancelOpen(false);
      setCounts({});
      setSuccess('Stock take cancelled');
      setError('');
      invalidateAll();
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to cancel'),
  });

  const getCountValue = (product) => {
    if (counts[product.id] !== undefined) return counts[product.id];
    const line = lineMap[product.id];
    return line ? String(line.counted_qty) : '';
  };

  const saveCount = (product) => {
    const raw = counts[product.id] !== undefined ? counts[product.id] : getCountValue(product);
    if (raw === '' || raw === null) {
      setError(`Enter a counted quantity for ${product.name}`);
      return;
    }
    lineMutation.mutate({ productId: product.id, countedQty: parseInt(raw, 10) });
  };

  if (!inventoryPro) {
    return (
      <Box>
        <PageHeader title="Stock Take" subtitle="Reconcile physical counts with system inventory" />
        <Card>
          <CardContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              Stock take requires the <strong>Inventory Pro</strong> feature pack.
            </Alert>
            <Button variant="contained" onClick={() => navigate('/settings')}>Enable in Settings</Button>
            <Button sx={{ ml: 1 }} variant="outlined" onClick={() => navigate('/subscription')}>View plans</Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const historyColumns = [
    { field: 'session_number', label: 'Session' },
    { field: 'branch_name', label: 'Branch', render: (r) => r.branch_name || 'All' },
    { field: 'line_count', label: 'Products counted' },
    { field: 'status', label: 'Status', render: (r) => <Chip label={r.status} size="small" color={statusColors[r.status] || 'default'} /> },
    {
      field: 'created_at',
      label: 'Date',
      render: (r) => new Date(r.created_at).toLocaleString(),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Stock Take"
        subtitle="Count products on the shelf and sync inventory automatically"
        action={openSession ? (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" color="inherit" startIcon={<Cancel />} onClick={() => setCancelOpen(true)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              onClick={() => setCompleteOpen(true)}
              disabled={countedCount === 0 || completeMutation.isPending}
            >
              Complete stock take
            </Button>
          </Stack>
        ) : (
          <Button variant="contained" startIcon={<PlayArrow />} onClick={() => setStartOpen(true)}>
            Start stock take
          </Button>
        )}
      />

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {sessionLoading ? (
        <LinearProgress sx={{ mb: 3 }} />
      ) : openSession ? (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <StatCard title="Session" value={openSession.session_number} icon={<Inventory2 />} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard title="Counted" value={`${countedCount} / ${totalProducts}`} icon={<Save />} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                title="Variances"
                value={(openSession.lines || []).filter((l) => l.variance !== 0).length}
                icon={<History />}
              />
            </Grid>
          </Grid>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">Progress</Typography>
                <Typography variant="body2" fontWeight={600}>{progress}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
              {openSession.branch_name && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Branch: {openSession.branch_name}
                </Typography>
              )}
            </CardContent>
          </Card>

          <TextField
            fullWidth
            size="small"
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
          />

          <TableContainer component={Paper} variant="outlined">
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell align="right">System qty</TableCell>
                  <TableCell align="right" sx={{ width: 140 }}>Counted qty</TableCell>
                  <TableCell align="center">Variance</TableCell>
                  <TableCell align="right" sx={{ width: 80 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts.map((product) => {
                  const line = lineMap[product.id];
                  const countVal = getCountValue(product);
                  const isSaved = !!line;
                  return (
                    <TableRow key={product.id} sx={{ bgcolor: isSaved ? 'action.hover' : 'inherit' }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={isSaved ? 600 : 400}>{product.name}</Typography>
                      </TableCell>
                      <TableCell>{product.sku || '—'}</TableCell>
                      <TableCell align="right">{product.stock_quantity}</TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          inputProps={{ min: 0 }}
                          value={countVal}
                          onChange={(e) => setCounts({ ...counts, [product.id]: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveCount(product); }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {varianceChip(product.stock_quantity, countVal !== '' ? countVal : line?.counted_qty)}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Save count">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => saveCount(product)}
                            disabled={lineMutation.isPending}
                          >
                            <Save fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filteredProducts.length && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No products match your search</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        <EmptyState
          illustration="inventory"
          title="No active stock take"
          message="Start a session to count products on your shelves. When you're done, inventory will be adjusted to match your counts."
          actionLabel="Start stock take"
          actionIcon={<PlayArrow />}
          onAction={() => setStartOpen(true)}
          benefits={[
            { icon: 'inventory', title: 'Accurate stock', description: 'Fix drift between shelf counts and system quantities.' },
            { icon: 'chart', title: 'Variance report', description: 'See overages and shortages before you apply changes.' },
            { icon: 'tag', title: 'Audit trail', description: 'Every adjustment is logged in inventory history.' },
          ]}
        />
      )}

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>Recent sessions</Typography>
        <DataTable
          columns={historyColumns}
          rows={history?.data || []}
          loading={historyLoading}
          emptyTitle="No stock take history"
          emptyMessage="Completed sessions will appear here"
        />
      </Box>

      <Dialog open={startOpen} onClose={() => setStartOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Start stock take</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Branch (optional)"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <MenuItem value="">All locations</MenuItem>
              {(branches || []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </TextField>
            <TextField
              fullWidth
              size="small"
              label="Notes"
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStartOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            disabled={startMutation.isPending}
            onClick={() => startMutation.mutate({ branch_id: branchId || null, notes: notes || null })}
          >
            {startMutation.isPending ? 'Starting...' : 'Start session'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={completeOpen}
        title="Complete stock take?"
        message={`This will update inventory for ${countedCount} counted product(s). Products with variances will be adjusted.`}
        confirmLabel="Complete"
        onConfirm={() => completeMutation.mutate()}
        onCancel={() => setCompleteOpen(false)}
        loading={completeMutation.isPending}
      />

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel stock take?"
        message="All counts in this session will be discarded. This cannot be undone."
        confirmLabel="Cancel session"
        danger
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setCancelOpen(false)}
        loading={cancelMutation.isPending}
      />
    </Box>
  );
}
