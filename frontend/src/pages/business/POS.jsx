import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Grid, Card, CardContent, CardMedia, Typography, TextField, Button, IconButton,
  List, ListItem, ListItemText, Divider, InputAdornment, Chip, Dialog, DialogTitle, DialogContent,
  Tab, Tabs, Drawer, Fab, Badge, Autocomplete, MenuItem, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Search, Add, Remove, Delete, Payment, Pause, PlayArrow, Receipt, QrCodeScanner, ShoppingCart,
} from '@mui/icons-material';
import api from '../../services/api';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import { resolveImageUrl } from '../../utils/imageUrl';
import { addItem, removeItem, updateQuantity, clearCart, setDiscount, loadCart, selectCartTotal } from '../../features/pos/cartSlice';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';

function ReceiptDialog({ orderId, open, onClose }) {
  const { formatMoney } = useBusinessCurrency();
  const { data } = useQuery({
    queryKey: ['receipt', orderId],
    queryFn: () => api.get(`/orders/${orderId}/receipt`).then((r) => r.data.data),
    enabled: !!orderId && open,
  });

  const print = () => {
    const w = window.open('', '_blank');
    w.document.write(`<html><body style="font-family:monospace;padding:20px">
      <h2>${data?.business?.name}</h2><p>${data?.business?.address || ''}</p><hr/>
      <p>Order: ${data?.order?.order_number}</p><p>${new Date(data?.printed_at).toLocaleString()}</p><hr/>
      ${data?.items?.map((i) => `<p>${i.product_name} x${i.quantity} ${formatMoney(i.total)}</p>`).join('')}
      <hr/><p><strong>Total: ${formatMoney(data?.order?.total_amount)}</strong></p>
      <p>${data?.footer}</p></body></html>`);
    w.print();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Receipt</DialogTitle>
      <DialogContent>
        {data && (
          <Box sx={{ fontFamily: 'monospace' }}>
            <Typography fontWeight={700}>{data.business?.name}</Typography>
            <Typography variant="body2">{data.order?.order_number}</Typography>
            <Divider sx={{ my: 1 }} />
            {data.items?.map((i) => (
              <Box key={i.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{i.product_name} x{i.quantity}</span>
                <span>{formatMoney(i.total)}</span>
              </Box>
            ))}
            <Divider sx={{ my: 1 }} />
            <Typography fontWeight={700}>Total: {formatMoney(data.order?.total_amount)}</Typography>
            <Button fullWidth variant="contained" sx={{ mt: 2 }} startIcon={<Receipt />} onClick={print}>Print Receipt</Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

function stockBadge(qty) {
  if (qty <= 0) return { label: 'Out', color: 'error' };
  if (qty <= 10) return { label: `Low ${qty}`, color: 'warning' };
  return { label: `${qty}`, color: 'default' };
}

function CartPanel({
  items, discount, taxRate, subtotal, taxAmount, grandTotal, onDiscountChange,
  onQtyChange, onRemove, onCheckout, onHold, onSplitOpen, checkoutPending, holdPending,
  customer, onCustomerChange, customers, branchId, onBranchChange, branches, compact,
  formatMoney, currency,
}) {
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: compact ? 'auto' : '100%' }}>
      <Typography variant="h6" gutterBottom>Current Sale {itemCount > 0 && `(${itemCount})`}</Typography>

      <TextField size="small" select label="Branch" value={branchId} onChange={(e) => onBranchChange(e.target.value)} sx={{ mb: 1 }}>
        <MenuItem value="">Default</MenuItem>
        {(branches || []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
      </TextField>

      <Autocomplete
        size="small"
        options={customers || []}
        getOptionLabel={(o) => o.name || ''}
        value={customer}
        onChange={(_, v) => onCustomerChange(v)}
        renderInput={(params) => <TextField {...params} label="Customer (optional)" />}
        sx={{ mb: 1 }}
      />

      {!items.length ? (
        <EmptyState title="Cart is empty" message="Scan a barcode or tap a product to add items" />
      ) : (
        <List dense sx={{ flex: 1, overflow: 'auto', maxHeight: compact ? 240 : 360 }}>
          {items.map((item, idx) => (
            <ListItem key={idx} secondaryAction={(
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton size="small" onClick={() => onQtyChange(idx, item.quantity - 1)}><Remove /></IconButton>
                <Typography component="span" sx={{ mx: 0.5, minWidth: 20, textAlign: 'center' }}>{item.quantity}</Typography>
                <IconButton size="small" onClick={() => onQtyChange(idx, item.quantity + 1)}><Add /></IconButton>
                <IconButton size="small" color="error" onClick={() => onRemove(idx)}><Delete /></IconButton>
              </Box>
            )}>
              <ListItemText
                primary={item.product_name}
                secondary={`${formatMoney(item.unit_price)} × ${item.quantity} = ${formatMoney(item.unit_price * item.quantity)}`}
              />
            </ListItem>
          ))}
        </List>
      )}

      <TextField fullWidth size="small" label={`Discount (${currency})`} type="number" value={discount}
        onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)} sx={{ my: 1 }} />

      <Box sx={{ textAlign: 'right', mb: 2 }}>
        <Typography variant="body2">Subtotal: {formatMoney(subtotal)}</Typography>
        <Typography variant="body2">Tax ({taxRate}%): {formatMoney(taxAmount)}</Typography>
        <Typography variant="h6" fontWeight={700}>Total: {formatMoney(grandTotal)}</Typography>
      </Box>

      <Grid container spacing={1}>
        <Grid item xs={6}>
          <Button fullWidth variant="contained" color="success" disabled={!items.length || checkoutPending}
            onClick={() => onCheckout('cash')}>Cash</Button>
        </Grid>
        <Grid item xs={6}>
          <Button fullWidth variant="contained" disabled={!items.length || checkoutPending}
            onClick={() => onCheckout('card')}>Card</Button>
        </Grid>
        <Grid item xs={6}>
          <Button fullWidth variant="outlined" disabled={!items.length} onClick={onSplitOpen}>Split Pay</Button>
        </Grid>
        <Grid item xs={6}>
          <Button fullWidth variant="outlined" disabled={!items.length || holdPending}
            startIcon={<Pause />} onClick={onHold}>Hold</Button>
        </Grid>
      </Grid>
    </Box>
  );
}

export default function POSPage() {
  const { formatMoney, currency } = useBusinessCurrency();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tab, setTab] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitCash, setSplitCash] = useState('');
  const [splitCard, setSplitCard] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [receiptId, setReceiptId] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [branchId, setBranchId] = useState('');
  const [resumeId, setResumeId] = useState(null);
  const barcodeRef = useRef(null);
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { items, discount } = useSelector((s) => s.cart);
  const { subtotal, total } = useSelector(selectCartTotal);

  const focusBarcode = useCallback(() => {
    setTimeout(() => barcodeRef.current?.focus(), 100);
  }, []);

  useEffect(() => { focusBarcode(); }, [focusBarcode]);

  const { data: settings } = useQuery({
    queryKey: ['business-settings'],
    queryFn: () => api.get('/settings').then((r) => r.data.data),
  });

  useEffect(() => {
    if (settings?.preferences?.tax_rate) setTaxRate(parseFloat(settings.preferences.tax_rate) || 0);
  }, [settings]);

  const { data: categories } = useQuery({
    queryKey: ['pos-categories'],
    queryFn: () => api.get('/categories', { params: { limit: 50 } }).then((r) => r.data.data),
  });

  const { data: branches } = useQuery({
    queryKey: ['pos-branches'],
    queryFn: () => api.get('/branches').then((r) => r.data.data),
  });

  const { data: customers } = useQuery({
    queryKey: ['pos-customers'],
    queryFn: () => api.get('/customers', { params: { limit: 100 } }).then((r) => r.data.data),
  });

  const { data: products } = useQuery({
    queryKey: ['pos-search', search, categoryId],
    queryFn: () => api.get('/products/search', {
      params: { q: search || 'a', limit: 48, category_id: categoryId || undefined },
    }).then((r) => r.data.data),
  });

  const { data: heldOrders } = useQuery({
    queryKey: ['held-orders'],
    queryFn: () => api.get('/orders/held').then((r) => r.data.data),
  });

  const taxAmount = (subtotal - discount) * (taxRate / 100);
  const grandTotal = subtotal - discount + taxAmount;
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  const buildItems = () => items.map((i) => ({
    product_id: i.product_id, product_name: i.product_name, sku: i.sku,
    quantity: i.quantity, unit_price: i.unit_price,
    tax: (i.unit_price * i.quantity) * (taxRate / 100) / Math.max(items.length, 1),
  }));

  const buildOrderPayload = (extra = {}) => ({
    items: buildItems(),
    discount_amount: discount,
    tax_amount: taxAmount,
    customer_id: customer?.id || null,
    branch_id: branchId || null,
    ...extra,
  });

  const checkoutMutation = useMutation({
    mutationFn: (payload) => api.post('/orders', payload),
    onSuccess: (res) => {
      dispatch(clearCart());
      setCustomer(null);
      setCartOpen(false);
      setReceiptId(res.data.data.id);
      queryClient.invalidateQueries(['held-orders']);
      queryClient.invalidateQueries(['orders']);
      focusBarcode();
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Checkout failed');
    },
  });

  const holdMutation = useMutation({
    mutationFn: (payload) => api.post('/orders/hold', payload),
    onSuccess: () => {
      dispatch(clearCart());
      setCartOpen(false);
      queryClient.invalidateQueries(['held-orders']);
      focusBarcode();
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (orderId) => api.post(`/orders/${orderId}/restore`),
    onSuccess: (res) => {
      const data = res.data.data;
      dispatch(loadCart({ items: data.items, discount: data.discount, notes: data.notes }));
      setCustomer(data.customer || null);
      setBranchId(data.branch_id || '');
      setResumeId(null);
      setTab(0);
      setCartOpen(true);
      queryClient.invalidateQueries(['held-orders']);
      focusBarcode();
    },
  });

  const addProduct = (p) => {
    if (p.stock_quantity <= 0) return;
    dispatch(addItem({
      product_id: p.id, product_name: p.name, sku: p.sku,
      unit_price: parseFloat(p.sale_price),
    }));
    focusBarcode();
  };

  const handleBarcode = (e) => {
    if (e.key === 'Enter' && e.target.value) {
      const code = e.target.value;
      api.get('/products/search', { params: { q: code, limit: 1 } }).then((r) => {
        const p = r.data.data?.[0];
        if (p) addProduct(p);
      });
      e.target.value = '';
    }
  };

  const handleCheckout = (method) => {
    checkoutMutation.mutate(buildOrderPayload({ payment_method: method, status: 'paid' }));
  };

  const handleHold = () => holdMutation.mutate(buildOrderPayload());

  const handleSplitPay = () => {
    const cash = parseFloat(splitCash) || 0;
    const card = parseFloat(splitCard) || 0;
    if (Math.abs(cash + card - grandTotal) > 0.02) {
      alert(`Payment total must equal ${formatMoney(grandTotal)}`);
      return;
    }
    checkoutMutation.mutate(buildOrderPayload({
      status: 'paid',
      payments: [
        { method: 'cash', amount: parseFloat(splitCash) || 0 },
        { method: 'card', amount: parseFloat(splitCard) || 0 },
      ],
    }));
    setSplitOpen(false);
  };

  const cartProps = {
    items, discount, taxRate, subtotal, taxAmount, grandTotal,
    onDiscountChange: (v) => dispatch(setDiscount(v)),
    onQtyChange: (idx, qty) => dispatch(updateQuantity({ index: idx, quantity: qty })),
    onRemove: (idx) => dispatch(removeItem(idx)),
    onCheckout: handleCheckout,
    onHold: handleHold,
    onSplitOpen: () => setSplitOpen(true),
    checkoutPending: checkoutMutation.isPending,
    holdPending: holdMutation.isPending,
    customer, onCustomerChange: setCustomer, customers,
    branchId, onBranchChange: setBranchId, branches,
    formatMoney, currency,
  };

  const heldColumns = [
    { field: 'order_number', label: 'Order #' },
    { field: 'total_amount', label: 'Total', render: (r) => formatMoney(r.total_amount) },
    { field: 'item_count', label: 'Items' },
    { field: 'created_at', label: 'Held', render: (r) => new Date(r.created_at).toLocaleString() },
    {
      field: 'actions', label: '',
      render: (r) => (
        <Button size="small" startIcon={<PlayArrow />} onClick={() => setResumeId(r.id)}>Resume</Button>
      ),
    },
  ];

  return (
    <Box sx={{ pb: isMobile ? 10 : 0 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>Point of Sale</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="New Sale" />
        <Tab label={`Held Sales (${heldOrders?.length || 0})`} />
      </Tabs>

      {tab === 0 ? (
        <Grid container spacing={2}>
          <Grid item xs={12} md={isMobile ? 12 : 7}>
            <TextField
              inputRef={barcodeRef}
              fullWidth
              placeholder="Scan barcode..."
              onKeyDown={handleBarcode}
              sx={{ mb: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><QrCodeScanner /></InputAdornment> }}
            />
            <TextField
              fullWidth
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ mb: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
            />

            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 1 }}>
              <Chip
                label="All"
                color={!categoryId ? 'primary' : 'default'}
                onClick={() => setCategoryId('')}
                variant={!categoryId ? 'filled' : 'outlined'}
              />
              {(categories || []).map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  color={categoryId === c.id ? 'primary' : 'default'}
                  onClick={() => setCategoryId(c.id)}
                  variant={categoryId === c.id ? 'filled' : 'outlined'}
                />
              ))}
            </Box>

            <Grid container spacing={1}>
              {(products || []).map((p) => {
                const stock = stockBadge(p.stock_quantity);
                const outOfStock = p.stock_quantity <= 0;
                return (
                  <Grid item xs={6} sm={4} md={3} key={p.id}>
                    <Card
                      sx={{
                        cursor: outOfStock ? 'not-allowed' : 'pointer',
                        opacity: outOfStock ? 0.55 : 1,
                        height: '100%',
                      }}
                      onClick={() => !outOfStock && addProduct(p)}
                    >
                      {p.image_url ? (
                        <CardMedia component="img" height={90} image={resolveImageUrl(p.image_url)} alt={p.name} sx={{ objectFit: 'cover' }} />
                      ) : (
                        <Box sx={{ height: 90, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography color="text.secondary" variant="h5">{p.name?.[0]}</Typography>
                        </Box>
                      )}
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{p.name}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                          <Typography color="primary" fontWeight={700}>{formatMoney(p.sale_price)}</Typography>
                          <Chip label={stock.label} size="small" color={stock.color} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>

          {!isMobile && (
            <Grid item md={5}>
              <Card sx={{ position: 'sticky', top: 80 }}>
                <CardContent>
                  <CartPanel {...cartProps} />
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      ) : (
        <DataTable
          columns={heldColumns}
          rows={heldOrders || []}
          emptyTitle="No held sales"
          emptyMessage="Park a sale from the New Sale tab to resume it later"
        />
      )}

      {isMobile && tab === 0 && (
        <>
          <Fab
            color="primary"
            sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1200 }}
            onClick={() => setCartOpen(true)}
          >
            <Badge badgeContent={cartCount} color="error">
              <ShoppingCart />
            </Badge>
          </Fab>
          <Drawer
            anchor="bottom"
            open={cartOpen}
            onClose={() => setCartOpen(false)}
            PaperProps={{ sx: { maxHeight: '85vh', borderTopLeftRadius: 16, borderTopRightRadius: 16, p: 2 } }}
          >
            <CartPanel {...cartProps} compact />
          </Drawer>
        </>
      )}

      <Dialog open={splitOpen} onClose={() => setSplitOpen(false)}>
        <DialogTitle>Split Payment</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>Total: {formatMoney(grandTotal)}</Typography>
          <TextField fullWidth label="Cash" type="number" value={splitCash} onChange={(e) => setSplitCash(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Card" type="number" value={splitCard} onChange={(e) => setSplitCard(e.target.value)} sx={{ mb: 2 }} />
          <Button fullWidth variant="contained" onClick={handleSplitPay}>Complete Payment</Button>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!resumeId}
        title="Resume held sale?"
        message="This will load the held sale back into your cart so you can complete checkout."
        onConfirm={() => resumeMutation.mutate(resumeId)}
        onCancel={() => setResumeId(null)}
        loading={resumeMutation.isPending}
        confirmLabel="Resume"
      />

      <ReceiptDialog orderId={receiptId} open={!!receiptId} onClose={() => setReceiptId(null)} />
    </Box>
  );
}
