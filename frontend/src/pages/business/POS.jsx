import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Grid, Card, CardContent, CardMedia, Typography, TextField, Button, IconButton,
  List, ListItem, ListItemText, Divider, InputAdornment, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Tab, Tabs, Drawer, Fab, Badge, Autocomplete, MenuItem, useMediaQuery, useTheme, Skeleton, Alert, Snackbar, ListItemButton,
} from '@mui/material';
import {
  Search, Add, Remove, Delete, Payment, Pause, PlayArrow, Receipt, QrCodeScanner, ShoppingCart,
  FilterAltOff, Inventory2,
} from '@mui/icons-material';
import api from '../../services/api';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import { resolveImageUrl } from '../../utils/imageUrl';
import { EMPTY_PRESETS } from '../../utils/emptyStatePresets';
import { addItem, removeItem, updateQuantity, clearCart, setDiscount, setLineDiscount, loadCart, selectCartTotal } from '../../features/pos/cartSlice';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import useTenantFeatures from '../../hooks/useTenantFeatures';
import useOfflineOrderSync from '../../hooks/useOfflineOrderSync';
import { enqueueOrder } from '../../utils/offlineQueue';

function genClientOrderId() {
  return `off_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

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

function VariantPickerDialog({ productId, open, onClose, onSelect, formatMoney }) {
  const { data: product, isLoading } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => api.get(`/products/${productId}`).then((r) => r.data.data),
    enabled: !!productId && open,
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Select variant</DialogTitle>
      <DialogContent>
        {isLoading && <Typography>Loading...</Typography>}
        {!isLoading && !(product?.variants?.length) && (
          <Typography color="text.secondary">No variants configured for this product.</Typography>
        )}
        <List dense>
          {(product?.variants || []).map((v) => (
            <ListItemButton
              key={v.id}
              disabled={v.stock_quantity <= 0}
              onClick={() => onSelect({
                product_id: product.id,
                variant_id: v.id,
                product_name: `${product.name} - ${v.name}`,
                sku: v.sku,
                unit_price: parseFloat(v.sale_price),
              })}
            >
              <ListItemText
                primary={v.name}
                secondary={`${formatMoney(v.sale_price)} · Stock: ${v.stock_quantity}`}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}

function stockBadge(qty) {
  if (qty <= 0) return { label: 'Out', color: 'error' };
  if (qty <= 10) return { label: `Low ${qty}`, color: 'warning' };
  return { label: `${qty}`, color: 'default' };
}

function ProductCardSkeleton() {
  return (
    <Card sx={{ height: '100%' }}>
      <Skeleton variant="rectangular" height={90} />
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Skeleton width="85%" height={20} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Skeleton width="40%" height={22} />
          <Skeleton width={48} height={24} sx={{ borderRadius: 3 }} />
        </Box>
      </CardContent>
    </Card>
  );
}

function ProductCatalog({
  products, isLoading, isError, onRetry, hasFilters, search, onClearFilters, onAddProduct,
  onAddProductCard, formatMoney,
}) {
  const inStockCount = (products || []).filter((p) => p.stock_quantity > 0).length;

  if (isLoading) {
    return (
      <Grid container spacing={1}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Grid item xs={6} sm={4} md={3} key={i}>
            <ProductCardSkeleton />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (isError) {
    return (
      <EmptyState
        illustration="products"
        title="Could not load products"
        message="Check your connection and try again."
        actionLabel="Retry"
        onAction={onRetry}
      />
    );
  }

  if (!products?.length) {
    if (hasFilters) {
      const filterHint = search.trim()
        ? `Nothing matches "${search.trim()}". Try another search term or category.`
        : 'No active products in this category. Pick another category or view all products.';

      return (
        <EmptyState
          illustration="products"
          title="No products found"
          message={filterHint}
          actionLabel="Clear filters"
          actionIcon={<FilterAltOff />}
          onAction={onClearFilters}
        />
      );
    }

    const preset = EMPTY_PRESETS.pos;
    return (
      <EmptyState
        illustration={preset.illustration}
        title={preset.title}
        message={preset.message}
        actionLabel={preset.actionLabel}
        actionIcon={<Inventory2 />}
        onAction={onAddProduct}
        benefits={preset.benefits}
      />
    );
  }

  return (
    <>
      {inStockCount === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          All matching products are out of stock. Restock inventory or adjust filters to sell items.
        </Alert>
      )}
      <Grid container spacing={1}>
        {products.map((p) => {
          const stock = stockBadge(p.stock_quantity);
          const outOfStock = p.stock_quantity <= 0;
          return (
            <Grid item xs={6} sm={4} md={3} key={p.id}>
              <Card
                sx={{
                  cursor: outOfStock ? 'not-allowed' : 'pointer',
                  opacity: outOfStock ? 0.55 : 1,
                  height: '100%',
                  transition: 'box-shadow 0.2s, transform 0.15s',
                  ...(!outOfStock && {
                    '&:hover': {
                      boxShadow: 4,
                      transform: 'translateY(-2px)',
                    },
                  }),
                }}
                onClick={() => !outOfStock && onAddProductCard(p)}
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
    </>
  );
}

function CartPanel({
  items, discount, taxRate, subtotal, taxAmount, grandTotal, onDiscountChange, onLineDiscountChange,
  onQtyChange, onRemove, onCheckout, onHold, onSplitOpen, checkoutPending, holdPending,
  customer, onCustomerChange, customers, branchId, onBranchChange, branches, compact,
  formatMoney, currency, hasPosPro, moneyLabel,
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
        <EmptyState
          compact
          illustration="cart"
          title="Cart is empty"
          message="Scan a barcode or tap a product to add items"
        />
      ) : (
        <List dense sx={{ flex: 1, overflow: 'auto', maxHeight: compact ? 240 : 360 }}>
          {items.map((item, idx) => (
            <ListItem key={idx} secondaryAction={(
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {hasPosPro && (
                  <TextField
                    size="small"
                    type="number"
                    label={compact ? 'Disc' : moneyLabel('Disc')}
                    sx={{ width: compact ? 78 : 96 }}
                    value={item.line_discount || ''}
                    onChange={(e) => onLineDiscountChange(idx, parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                )}
                <IconButton size="small" onClick={() => onQtyChange(idx, item.quantity - 1)}><Remove /></IconButton>
                <Typography component="span" sx={{ mx: 0.5, minWidth: 20, textAlign: 'center' }}>{item.quantity}</Typography>
                <IconButton size="small" onClick={() => onQtyChange(idx, item.quantity + 1)}><Add /></IconButton>
                <IconButton size="small" color="error" onClick={() => onRemove(idx)}><Delete /></IconButton>
              </Box>
            )}>
              <ListItemText
                primary={item.product_name}
                secondary={`${formatMoney(item.unit_price)} × ${item.quantity} = ${formatMoney(item.unit_price * item.quantity - (item.line_discount || 0))}`}
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
          {hasPosPro && (
          <Button fullWidth variant="outlined" disabled={!items.length || holdPending}
            startIcon={<Pause />} onClick={onHold}>Hold</Button>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default function POSPage() {
  const navigate = useNavigate();
  const { formatMoney, currency, moneyLabel } = useBusinessCurrency();
  const { hasFeature } = useTenantFeatures();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
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
  const [variantProductId, setVariantProductId] = useState(null);
  const [barcodeMiss, setBarcodeMiss] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [managerPin, setManagerPin] = useState('');
  const [managerEmployeeId, setManagerEmployeeId] = useState('');
  const [openPriceProduct, setOpenPriceProduct] = useState(null);
  const [openPriceValue, setOpenPriceValue] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const barcodeRef = useRef(null);
  const [offlineMsg, setOfflineMsg] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { items, discount } = useSelector((s) => s.cart);
  const { subtotal, total } = useSelector(selectCartTotal);

  const { online, pending, syncing, refreshCount } = useOfflineOrderSync({
    onSynced: (count) => {
      setSyncMsg(`${count} offline sale${count > 1 ? 's' : ''} synced`);
      queryClient.invalidateQueries(['orders']);
    },
  });

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

  const { data: products, isLoading: productsLoading, isError: productsError, refetch: refetchProducts } = useQuery({
    queryKey: ['pos-search', search, categoryId],
    queryFn: () => api.get('/products/search', {
      params: { q: search.trim(), limit: 48, category_id: categoryId || undefined },
    }).then((r) => r.data.data),
  });

  const trimmedSearch = search.trim();
  const hasProductFilters = Boolean(trimmedSearch || categoryId);

  const clearProductFilters = () => {
    setSearch('');
    setCategoryId('');
    focusBarcode();
  };

  const { data: employees } = useQuery({
    queryKey: ['pos-employees'],
    queryFn: () => api.get('/employees', { params: { limit: 100 } }).then((r) => r.data.data),
    enabled: hasFeature('staff_pro'),
  });

  const { data: heldOrders } = useQuery({
    queryKey: ['held-orders'],
    queryFn: () => api.get('/orders/held').then((r) => r.data.data),
    enabled: hasFeature('pos_pro'),
  });

  const taxAmount = (subtotal - discount) * (taxRate / 100);
  const grandTotal = subtotal - discount + taxAmount;
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  const buildItems = () => items.map((i) => ({
    product_id: i.product_id,
    variant_id: i.variant_id || undefined,
    quantity: i.quantity,
    discount: i.line_discount || 0,
    unit_price: i.open_price != null ? i.open_price : undefined,
  }));

  const buildOrderPayload = (extra = {}) => ({
    items: buildItems(),
    discount_amount: discount,
    customer_id: customer?.id || null,
    branch_id: branchId || null,
    coupon_code: couponCode || undefined,
    manager_employee_id: extra.manager_employee_id || undefined,
    manager_pin: extra.manager_pin || undefined,
    ...extra,
  });

  const [placing, setPlacing] = useState(false);

  const completeSaleUi = () => {
    dispatch(clearCart());
    setCustomer(null);
    setCartOpen(false);
    focusBarcode();
  };

  const queueOffline = async (payload) => {
    await enqueueOrder(payload);
    completeSaleUi();
    await refreshCount();
    setOfflineMsg(true);
  };

  // Single entry point for completing a sale. Queues locally when offline (or on
  // a network error) so the register keeps working; synced later automatically.
  const placeOrder = async (payload) => {
    const finalPayload = { ...payload, client_order_id: payload.client_order_id || genClientOrderId() };
    if (!online) {
      await queueOffline(finalPayload);
      return;
    }
    setPlacing(true);
    try {
      const res = await api.post('/orders', finalPayload);
      completeSaleUi();
      setReceiptId(res.data.data.id);
      queryClient.invalidateQueries(['held-orders']);
      queryClient.invalidateQueries(['orders']);
    } catch (err) {
      if (!err.response) {
        // Connection dropped mid-request — preserve the sale offline
        await queueOffline(finalPayload);
      } else {
        alert(err.response?.data?.message || 'Checkout failed');
      }
    } finally {
      setPlacing(false);
    }
  };

  const submitCheckout = (payload) => {
    placeOrder(payload);
  };

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
    if (p.stock_quantity <= 0 && !hasFeature('allow_negative_stock')) return;
    if (p.is_open_price && hasFeature('open_price_items')) {
      setOpenPriceProduct(p);
      setOpenPriceValue(String(p.sale_price || ''));
      return;
    }
    if (p.product_type === 'variable' && hasFeature('pos_pro')) {
      setVariantProductId(p.id);
      return;
    }
    dispatch(addItem({
      product_id: p.id, product_name: p.name, sku: p.sku,
      unit_price: parseFloat(p.sale_price),
    }));
    focusBarcode();
  };

  const addVariantToCart = (item) => {
    dispatch(addItem({ ...item, quantity: 1 }));
    setVariantProductId(null);
    focusBarcode();
  };

  const handleBarcode = (e) => {
    if (e.key === 'Enter' && e.target.value) {
      const code = e.target.value;
      api.get('/products/search', { params: { q: code, limit: 1 } }).then((r) => {
        const p = r.data.data?.[0];
        if (p) addProduct(p);
        else setBarcodeMiss(true);
      });
      e.target.value = '';
    }
  };

  const runCheckout = (payload) => {
    if (discount > subtotal * 0.2 && hasFeature('pos_pro')) {
      setPendingCheckout(payload);
      setManagerOpen(true);
      return;
    }
    placeOrder(payload);
  };

  const handleCheckout = (method) => {
    runCheckout(buildOrderPayload({ payment_method: method, status: 'paid' }));
  };

  const handleHold = () => {
    if (!hasFeature('pos_pro')) return;
    holdMutation.mutate(buildOrderPayload());
  };

  const handleSplitPay = () => {
    const cash = parseFloat(splitCash) || 0;
    const card = parseFloat(splitCard) || 0;
    if (Math.abs(cash + card - grandTotal) > 0.02) {
      alert(`Payment total must equal ${formatMoney(grandTotal)}`);
      return;
    }
    runCheckout(buildOrderPayload({
      status: 'paid',
      payments: [
        { method: 'cash', amount: parseFloat(splitCash) || 0 },
        { method: 'card', amount: parseFloat(splitCard) || 0 },
      ],
    }));
    setSplitOpen(false);
  };

  const quickKeys = settings?.preferences?.pos_quick_keys || [];

  const cartProps = {
    items, discount, taxRate, subtotal, taxAmount, grandTotal,
    onDiscountChange: (v) => dispatch(setDiscount(v)),
    onLineDiscountChange: (idx, v) => dispatch(setLineDiscount({ index: idx, discount: v })),
    onQtyChange: (idx, qty) => dispatch(updateQuantity({ index: idx, quantity: qty })),
    onRemove: (idx) => dispatch(removeItem(idx)),
    onCheckout: handleCheckout,
    onHold: handleHold,
    onSplitOpen: () => setSplitOpen(true),
    checkoutPending: placing,
    holdPending: holdMutation.isPending,
    customer, onCustomerChange: setCustomer, customers,
    branchId, onBranchChange: setBranchId, branches,
    formatMoney, currency,
    hasPosPro: hasFeature('pos_pro'),
    moneyLabel,
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
    <Box sx={{ pb: isMobile ? 10 : 0, ...(isTablet && { maxWidth: 1200, mx: 'auto' }) }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>Point of Sale</Typography>

      {!online && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You are offline. Sales will be saved on this device and synced automatically when the connection returns.
        </Alert>
      )}
      {online && pending > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {syncing ? 'Syncing' : 'Pending'} {pending} offline sale{pending > 1 ? 's' : ''}…
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="New Sale" />
        {hasFeature('pos_pro') && (
          <Tab label={`Held Sales (${heldOrders?.length || 0})`} />
        )}
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

            {hasFeature('pos_pro') && quickKeys.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 1 }}>
                {quickKeys.map((key) => (
                  <Chip key={key.product_id || key.id} label={key.name || key.label} onClick={() => {
                    const p = (products || []).find((x) => x.id === (key.product_id || key.id));
                    if (p) addProduct(p);
                  }} />
                ))}
              </Box>
            )}

            {hasFeature('catalog_pro') && (
              <TextField
                fullWidth size="small" placeholder="Coupon code" value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                sx={{ mb: 1 }}
              />
            )}

            <Box sx={{ minHeight: 280 }}>
              <ProductCatalog
                products={products}
                isLoading={productsLoading}
                isError={productsError}
                onRetry={refetchProducts}
                hasFilters={hasProductFilters}
                search={search}
                onClearFilters={clearProductFilters}
                onAddProduct={() => navigate('/products')}
                onAddProductCard={addProduct}
                formatMoney={formatMoney}
              />
            </Box>
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
          <TextField fullWidth label={moneyLabel('Cash')} type="number" value={splitCash} onChange={(e) => setSplitCash(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label={moneyLabel('Card')} type="number" value={splitCard} onChange={(e) => setSplitCard(e.target.value)} sx={{ mb: 2 }} />
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

      <VariantPickerDialog
        productId={variantProductId}
        open={!!variantProductId}
        onClose={() => setVariantProductId(null)}
        onSelect={addVariantToCart}
        formatMoney={formatMoney}
      />

      <Snackbar open={barcodeMiss} autoHideDuration={3000} onClose={() => setBarcodeMiss(false)}
        message="No product found for scanned barcode" />

      <Snackbar open={offlineMsg} autoHideDuration={4000} onClose={() => setOfflineMsg(false)}
        message="Sale saved offline — will sync when back online" />

      <Snackbar open={!!syncMsg} autoHideDuration={4000} onClose={() => setSyncMsg('')}
        message={syncMsg} />

      <Dialog open={managerOpen} onClose={() => setManagerOpen(false)}>
        <DialogTitle>Manager approval</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>Discount exceeds 20%. Select manager and enter PIN.</Typography>
          <TextField fullWidth select label="Manager" value={managerEmployeeId}
            onChange={(e) => setManagerEmployeeId(e.target.value)} sx={{ mb: 2 }}>
            {(employees || []).map((e) => (
              <MenuItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth type="password" label="Manager PIN" value={managerPin} onChange={(e) => setManagerPin(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManagerOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={async () => {
            if (!managerEmployeeId || managerPin.length < 4) return;
            try {
              await api.post('/employees/verify-pin', { employee_id: managerEmployeeId, pin: managerPin });
              submitCheckout(buildOrderPayload({
                ...pendingCheckout,
                manager_employee_id: managerEmployeeId,
                manager_pin: managerPin,
              }));
              setManagerOpen(false);
              setManagerPin('');
              setManagerEmployeeId('');
              setPendingCheckout(null);
            } catch (err) {
              alert(err.response?.data?.message || 'PIN verification failed');
            }
          }}>Approve</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openPriceProduct} onClose={() => setOpenPriceProduct(null)}>
        <DialogTitle>Set price — {openPriceProduct?.name}</DialogTitle>
        <DialogContent>
          <TextField fullWidth type="number" label="Sale price" value={openPriceValue}
            onChange={(e) => setOpenPriceValue(e.target.value)} inputProps={{ min: 0, step: 0.01 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPriceProduct(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => {
            const price = parseFloat(openPriceValue);
            if (!Number.isFinite(price) || price < 0) return;
            dispatch(addItem({
              product_id: openPriceProduct.id,
              product_name: openPriceProduct.name,
              sku: openPriceProduct.sku,
              unit_price: price,
              open_price: price,
            }));
            setOpenPriceProduct(null);
            focusBarcode();
          }}>Add to cart</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
