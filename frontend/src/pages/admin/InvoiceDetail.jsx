import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Grid, Button, Stack, IconButton, Tooltip,
  Table, TableBody, TableCell, TableHead, TableRow, alpha, useTheme, MenuItem, TextField,
} from '@mui/material';
import {
  ArrowBack, Receipt, ContentCopy, InfoOutlined, BoltOutlined, Business,
  AttachMoney, Percent, LocalOffer, CreditCard, CalendarToday, Event, Notes,
  CheckCircleOutline, CancelOutlined, OpenInNew,
} from '@mui/icons-material';
import api from '../../services/api';
import { formatMoney } from '../../utils/currency';
import LoadingState from '../../components/LoadingState';
import { formatDisplayText } from '../../utils/displayText';

const STATUS_COLORS = {
  pending: 'warning',
  paid: 'success',
  failed: 'error',
  refunded: 'info',
  cancelled: 'default',
};

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).replace(',', ' •');
}

function StatusBadge({ status }) {
  const theme = useTheme();
  const colorKey = STATUS_COLORS[status] || 'default';
  const palette = theme.palette[colorKey]?.main || theme.palette.text.secondary;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 0.75,
        borderRadius: 999,
        bgcolor: alpha(palette, 0.12),
        border: '1px solid',
        borderColor: alpha(palette, 0.35),
      }}
    >
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: palette }} />
      <Typography variant="body2" fontWeight={600} sx={{ color: palette }}>
        {formatDisplayText(status)}
      </Typography>
    </Box>
  );
}

function SectionCard({ icon, title, subtitle, children }) {
  return (
    <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: (t) => alpha(t.palette.primary.main, 0.1), color: 'primary.main', flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>{title}</Typography>
            {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
          </Box>
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

function DetailRow({ icon, label, value, valueNode }) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 1.5 }}>
      <Box sx={{ color: 'text.secondary', display: 'flex', minWidth: 24 }}>{icon}</Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
        {valueNode || <Typography fontWeight={600}>{value ?? '—'}</Typography>}
      </Box>
    </Stack>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('manual');

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['billing-invoice', id],
    queryFn: () => api.get(`/billing/${id}`).then((r) => r.data.data),
  });

  const markPaid = useMutation({
    mutationFn: () => api.post(`/billing/${id}/mark-paid`, { payment_method: paymentMethod }),
    onSuccess: () => {
      queryClient.invalidateQueries(['billing-invoice', id]);
      queryClient.invalidateQueries(['billing-invoices']);
    },
  });

  const cancel = useMutation({
    mutationFn: () => api.post(`/billing/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries(['billing-invoice', id]);
      queryClient.invalidateQueries(['billing-invoices']);
    },
  });

  const copyNumber = async () => {
    if (!invoice?.invoice_number) return;
    await navigator.clipboard.writeText(invoice.invoice_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <LoadingState message="Loading invoice…" />;
  if (!invoice) return <Typography>Invoice not found</Typography>;

  const fmt = (amount) => formatMoney(amount, invoice.currency);
  const canMarkPaid = invoice.status === 'pending' || invoice.status === 'failed';
  const canCancel = invoice.status === 'pending' || invoice.status === 'failed';

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/admin/billing')}
        sx={{ mb: 3, color: 'primary.main', fontWeight: 600, px: 0 }}
      >
        Back to Billing
      </Button>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Stack direction="row" spacing={2.5} alignItems="center">
          <Box
            sx={{
              width: 72, height: 72, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.15), color: 'primary.main',
            }}
          >
            <Receipt sx={{ fontSize: 36 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800} lineHeight={1.2}>
              {invoice.tenant_name || 'Invoice'}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography color="text.secondary" fontWeight={600}>#{invoice.invoice_number}</Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy invoice number'}>
                <IconButton size="small" onClick={copyNumber} sx={{ color: 'text.secondary' }}>
                  <ContentCopy sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </Stack>
        <StatusBadge status={invoice.status} />
      </Stack>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <SectionCard icon={<InfoOutlined />} title="Invoice Details" subtitle="Amount breakdown and billing metadata.">
            <DetailRow icon={<Business fontSize="small" />} label="Tenant" value={invoice.tenant_name} />
            <DetailRow icon={<LocalOffer fontSize="small" />} label="Plan" value={invoice.plan_name || '—'} />
            <DetailRow icon={<AttachMoney fontSize="small" />} label="Subtotal" value={fmt(invoice.amount)} />
            <DetailRow icon={<Percent fontSize="small" />} label="Tax" value={fmt(invoice.tax)} />
            <DetailRow icon={<LocalOffer fontSize="small" />} label="Discount" value={fmt(invoice.discount)} />
            <DetailRow
              icon={<CreditCard fontSize="small" />}
              label="Total"
              valueNode={<Typography fontWeight={800} color="primary.main">{fmt(invoice.total)}</Typography>}
            />
            <DetailRow icon={<CalendarToday fontSize="small" />} label="Created At" value={formatDateTime(invoice.created_at)} />
            <DetailRow icon={<Event fontSize="small" />} label="Due Date" value={formatDateTime(invoice.due_date)} />
            <DetailRow icon={<CheckCircleOutline fontSize="small" />} label="Paid At" value={formatDateTime(invoice.paid_at)} />
            {invoice.notes && (
              <DetailRow icon={<Notes fontSize="small" />} label="Notes" value={invoice.notes} />
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={5}>
          <SectionCard icon={<BoltOutlined />} title="Actions" subtitle="Manage invoice status and tenant billing.">
            {canMarkPaid && (
              <Box sx={{ mb: 2 }}>
                <TextField
                  select fullWidth size="small" label="Payment method" value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)} sx={{ mb: 1.5 }}
                >
                  <MenuItem value="manual">Manual</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="bank">Bank Transfer</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                </TextField>
                <Button
                  fullWidth variant="contained" color="success" startIcon={<CheckCircleOutline />}
                  onClick={() => markPaid.mutate()} disabled={markPaid.isPending}
                >
                  Mark as Paid
                </Button>
              </Box>
            )}
            {canCancel && (
              <Button
                fullWidth variant="outlined" color="error" startIcon={<CancelOutlined />}
                onClick={() => cancel.mutate()} disabled={cancel.isPending} sx={{ mb: 2 }}
              >
                Cancel Invoice
              </Button>
            )}
            <Button
              fullWidth variant="outlined" startIcon={<OpenInNew />}
              onClick={() => navigate(`/admin/businesses/${invoice.tenant_id}`)}
            >
              View Tenant
            </Button>
          </SectionCard>
        </Grid>
      </Grid>

      {(invoice.payments?.length > 0) && (
        <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Payment History</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Transaction</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoice.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDateTime(p.paid_at || p.created_at)}</TableCell>
                    <TableCell>{p.transaction_id || '—'}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{p.payment_method || '—'}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{p.payment_provider || '—'}</TableCell>
                    <TableCell align="right">{formatMoney(p.amount, p.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
