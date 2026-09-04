import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, Divider, Table, TableBody, TableCell,
  TableHead, TableRow, Paper, CircularProgress,
} from '@mui/material';
import { ArrowBack, Print } from '@mui/icons-material';
import api from '../../services/api';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import { formatDisplayText } from '../../utils/displayText';
import './OrderInvoice.print.css';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function addressLines(addr) {
  if (!addr) return [];
  if (addr.formatted) return [addr.formatted];
  return [
    addr.line1,
    addr.line2,
    [addr.city, addr.state, addr.postal_code].filter(Boolean).join(', '),
    addr.country,
  ].filter(Boolean);
}

export default function OrderInvoicePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatMoney } = useBusinessCurrency();

  const { data, isLoading, error } = useQuery({
    queryKey: ['order-invoice', id],
    queryFn: () => api.get(`/orders/${id}/receipt`).then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data?.order) {
    return <Typography color="error">Invoice not found</Typography>;
  }

  const { business, branch, order, items = [], payments = [] } = data;
  const customer = order.customer;
  const shipLines = addressLines(order.shipping_address);
  const invoiceNumber = order.order_number;

  return (
    <Box className="order-invoice-page">
      <Stack
        direction="row"
        spacing={1}
        className="order-invoice-toolbar no-print"
        sx={{ mb: 3, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
      >
        <Button startIcon={<ArrowBack />} onClick={() => navigate(`/orders/${id}`)}>
          Back to order
        </Button>
        <Button variant="contained" startIcon={<Print />} onClick={() => window.print()}>
          Print invoice
        </Button>
      </Stack>

      <Paper className="order-invoice" elevation={0} sx={{ p: { xs: 2, md: 4 }, maxWidth: 900, mx: 'auto' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={3} sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
              Invoice
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              #{invoiceNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {formatDate(order.created_at)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Typography variant="h6" fontWeight={700}>{business?.name || 'Store'}</Typography>
            {(branch?.address || business?.address) && (
              <Typography variant="body2" color="text.secondary">{branch?.address || business?.address}</Typography>
            )}
            {(branch?.phone || business?.phone) && (
              <Typography variant="body2" color="text.secondary">{branch?.phone || business?.phone}</Typography>
            )}
            {(branch?.email || business?.email) && (
              <Typography variant="body2" color="text.secondary">{branch?.email || business?.email}</Typography>
            )}
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} sx={{ mb: 4 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="overline" color="text.secondary">Bill to</Typography>
            {customer ? (
              <>
                <Typography fontWeight={700}>{customer.name || 'Customer'}</Typography>
                {customer.email && <Typography variant="body2">{customer.email}</Typography>}
                {customer.phone && <Typography variant="body2">{customer.phone}</Typography>}
                {customer.address && !shipLines.length && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{customer.address}</Typography>
                )}
              </>
            ) : (
              <Typography color="text.secondary">Walk-in customer</Typography>
            )}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="overline" color="text.secondary">
              {order.fulfillment_status === 'awaiting_pickup' ? 'Pickup' : 'Ship to'}
            </Typography>
            {order.pickup_branch ? (
              <>
                <Typography fontWeight={700}>{order.pickup_branch.name}</Typography>
                {order.pickup_branch.address && (
                  <Typography variant="body2">{order.pickup_branch.address}</Typography>
                )}
              </>
            ) : shipLines.length ? (
              shipLines.map((line) => (
                <Typography key={line} variant="body2">{line}</Typography>
              ))
            ) : (
              <Typography color="text.secondary">—</Typography>
            )}
            <Typography variant="body2" sx={{ mt: 1.5 }}>
              <strong>Payment:</strong> {formatDisplayText(order.payment_method) || '—'}
            </Typography>
            <Typography variant="body2">
              <strong>Status:</strong> {formatDisplayText(order.status) || '—'}
            </Typography>
          </Box>
        </Stack>

        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Discount</TableCell>
              <TableCell align="right">Tax</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Typography fontWeight={600}>{item.product_name}</Typography>
                  {item.sku && (
                    <Typography variant="caption" color="text.secondary">SKU {item.sku}</Typography>
                  )}
                </TableCell>
                <TableCell align="right">{item.quantity}</TableCell>
                <TableCell align="right">{formatMoney(item.unit_price)}</TableCell>
                <TableCell align="right">-{formatMoney(item.discount || 0)}</TableCell>
                <TableCell align="right">{formatMoney(item.tax || 0)}</TableCell>
                <TableCell align="right">{formatMoney(item.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Box sx={{ width: { xs: '100%', sm: 280 } }}>
            <Stack spacing={0.75}>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Subtotal</Typography>
                <Typography>{formatMoney(order.subtotal)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Tax</Typography>
                <Typography>{formatMoney(order.tax_amount)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Discount</Typography>
                <Typography>-{formatMoney(order.discount_amount)}</Typography>
              </Stack>
              {Number(order.tip_amount) > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Tip</Typography>
                  <Typography>{formatMoney(order.tip_amount)}</Typography>
                </Stack>
              )}
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="h6" fontWeight={800}>Total</Typography>
                <Typography variant="h6" fontWeight={800}>{formatMoney(order.total_amount)}</Typography>
              </Stack>
            </Stack>
          </Box>
        </Box>

        {payments.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle2" gutterBottom>Payments</Typography>
            {payments.map((p) => (
              <Typography key={p.id} variant="body2" color="text.secondary">
                {formatDisplayText(p.payment_method)} — {formatMoney(p.amount)}
              </Typography>
            ))}
          </Box>
        )}

        {data.footer && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
            {typeof data.footer === 'string' ? data.footer.replace(/^"|"$/g, '') : data.footer}
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
