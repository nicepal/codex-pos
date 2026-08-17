import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Alert, Drawer, Stack, Text, Group, List, ActionIcon, Affix,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ShoppingCart } from '@mui/icons-material';
import { CodexModal, CodexButton, CodexInput, CodexSelect } from '../../design-system';
import api from '../../services/api';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import {
  addItem, removeItem, voidLine, setLinePrice, updateQuantity, clearCart, setDiscount, setLineDiscount, loadCart, selectCartSubtotal,
  setPosMode, setRestaurantOrderType, setRestaurantContext, clearRestaurantTable, setKitchenSent, markItemsKitchenSent, selectRestaurantContext,
  applyKitchenStatuses, syncOrderItemIds,
} from '../../features/pos/cartSlice';
import ConfirmDialog from '../../components/ConfirmDialog';
import useTenantFeatures from '../../hooks/useTenantFeatures';
import useOfflineOrderSync from '../../hooks/useOfflineOrderSync';
import { enqueueOrder } from '../../utils/offlineQueue';
import { setTokens, selectAuth } from '../../features/auth/authSlice';
import { estimateCartTax } from '../../utils/posTax';
import { posNotifyError, posNotifySuccess, posNotifyWarning } from '../../components/pos/posNotify';
import {
  POSHeader,
  POSSearch,
  CategoryBar,
  ProductGrid,
  CartPanel,
  CashPaymentDialog,
  CardPaymentDialog,
  SplitPaymentDialog,
  GiftCardPaymentDialog,
  LoyaltyPaymentDialog,
  HeldSalesDialog,
  SaleSuccessDialog,
  POSKeyboardShortcuts,
  ExitPOSDialog,
  VariantPickerDialog,
  PinLockOverlay,
  RegisterGate,
  CashManagementDialog,
  CloseRegisterDialog,
  ReceiptHistoryDialog,
  ReturnRefundDialog,
  OfflineQueueDialog,
  ManagerOverrideDialog,
  HardwareDialog,
  employeeLabel,
  managerEmployees,
  friendlyPosError,
  buildOfflineReceiptData,
  RestaurantModeSelector,
  RestaurantContextBar,
  TablePickerDialog,
  ModifierPickerDialog,
  SendToKitchenDialog,
} from '../../components/pos';

function genClientOrderId() {
  return `off_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function POSPage() {
  const navigate = useNavigate();
  const { formatMoney, currency, moneyLabel } = useBusinessCurrency();
  const { hasFeature } = useTenantFeatures();
  const isMobile = useMediaQuery('(max-width: 61.99em)');

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [cashOpen, setCashOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [taxRate, setTaxRate] = useState(0);
  const [receiptId, setReceiptId] = useState(null);
  const [receiptCash, setReceiptCash] = useState({ tendered: null, change: null });
  const [customer, setCustomer] = useState(null);
  const [branchId, setBranchId] = useState('');
  const [resumeId, setResumeId] = useState(null);
  const [variantProductId, setVariantProductId] = useState(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerContext, setManagerContext] = useState('checkout');
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [pendingVoidIndex, setPendingVoidIndex] = useState(null);
  const [pendingPriceIndex, setPendingPriceIndex] = useState(null);
  const [pendingPriceValue, setPendingPriceValue] = useState('');
  const [lastBarcode, setLastBarcode] = useState('');
  const [priceOverrideOpen, setPriceOverrideOpen] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [managerEmployeeId, setManagerEmployeeId] = useState('');
  const [openPriceProduct, setOpenPriceProduct] = useState(null);
  const [openPriceValue, setOpenPriceValue] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [serialProduct, setSerialProduct] = useState(null);
  const [serialValue, setSerialValue] = useState('');
  const [batchProduct, setBatchProduct] = useState(null);
  const [batchId, setBatchId] = useState('');
  const [pinLocked, setPinLocked] = useState(() => {
    try { return sessionStorage.getItem('posPinLocked') === '1'; } catch { return false; }
  });
  const [pinEmployeeId, setPinEmployeeId] = useState('');
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [exitAfterHold, setExitAfterHold] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [registerEmployeeId, setRegisterEmployeeId] = useState('');
  const [openingFloat, setOpeningFloat] = useState('0');
  const [registerBusy, setRegisterBusy] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [cashMgmtOpen, setCashMgmtOpen] = useState(false);
  const [closeRegOpen, setCloseRegOpen] = useState(false);
  const [closeRegMode, setCloseRegMode] = useState('close');
  const [receiptHistoryOpen, setReceiptHistoryOpen] = useState(false);
  const [returnsOpen, setReturnsOpen] = useState(false);
  const [offlineQueueOpen, setOfflineQueueOpen] = useState(false);
  const [hardwareOpen, setHardwareOpen] = useState(false);
  const [offlineReceipt, setOfflineReceipt] = useState(null);
  const offlineReceiptRef = useRef(null);
  const [barcodeFeedback, setBarcodeFeedback] = useState(null);
  const [forceGate, setForceGate] = useState(false);
  const [sessionClosedLocal, setSessionClosedLocal] = useState(false);
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [modifierProduct, setModifierProduct] = useState(null);
  const [kitchenDialogOpen, setKitchenDialogOpen] = useState(false);
  const [sendKitchenPending, setSendKitchenPending] = useState(false);

  const barcodeRef = useRef(null);
  const searchInputRef = useRef(null);
  const customerInputRef = useRef(null);

  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { tenant, user } = useSelector(selectAuth);
  const { items, discount } = useSelector((s) => s.cart);
  const restaurant = useSelector(selectRestaurantContext);
  const subtotal = useSelector(selectCartSubtotal);

  const allowNegativeStock = hasFeature('allow_negative_stock');
  const hasPosPro = hasFeature('pos_pro');
  const hasStaffPro = hasFeature('staff_pro');
  const hasTaxAdvanced = hasFeature('tax_advanced');
  const hasRestaurantPro = hasFeature('restaurant_pro');

  useEffect(() => {
    offlineReceiptRef.current = offlineReceipt;
  }, [offlineReceipt]);

  const { online, pending, syncing, refreshCount, flush, flushSingle } = useOfflineOrderSync({
    onSynced: (synced) => {
      const count = synced.length;
      posNotifySuccess(`${count} offline sale${count > 1 ? 's' : ''} synced`);
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['drawer-summary']);
      const match = synced.find((s) => s.localId && s.localId === offlineReceiptRef.current?.localId);
      if (match?.orderId) {
        setOfflineReceipt(null);
        setReceiptId(match.orderId);
      }
    },
  });

  const focusBarcode = useCallback(() => {
    setTimeout(() => barcodeRef.current?.focus(), 100);
  }, []);

  const focusSearch = useCallback(() => {
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  const focusCustomer = useCallback(() => {
    if (isMobile) setCartOpen(true);
    setTimeout(() => customerInputRef.current?.focus(), 150);
  }, [isMobile]);

  useEffect(() => { focusBarcode(); }, [focusBarcode]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('posMode');
      if (saved === 'retail' || saved === 'restaurant') {
        dispatch(setPosMode(saved));
        if (saved === 'restaurant') {
          dispatch(setRestaurantOrderType('dine_in'));
        }
      }
    } catch { /* ignore */ }
  }, [dispatch]);

  const handlePosModeChange = (mode) => {
    dispatch(setPosMode(mode));
    try { localStorage.setItem('posMode', mode); } catch { /* ignore */ }
    if (mode === 'restaurant') {
      dispatch(setRestaurantOrderType('dine_in'));
    }
  };

  const { data: restaurantSettings } = useQuery({
    queryKey: ['restaurant-settings'],
    queryFn: () => api.get('/restaurant/settings').then((r) => r.data.data),
    enabled: hasRestaurantPro,
  });

  const { data: settings } = useQuery({
    queryKey: ['business-settings'],
    queryFn: () => api.get('/settings').then((r) => r.data.data),
  });

  const { data: taxRules } = useQuery({
    queryKey: ['pos-tax-rules'],
    queryFn: () => api.get('/tax-rules').then((r) => r.data.data),
    enabled: hasTaxAdvanced,
  });

  useEffect(() => {
    const flat = parseFloat(settings?.preferences?.tax_rate) || 0;
    if (hasTaxAdvanced && Array.isArray(taxRules) && taxRules.length) {
      const def = taxRules.find((r) => r.is_default) || taxRules[0];
      setTaxRate(parseFloat(def?.rate) || flat);
    } else {
      setTaxRate(flat);
    }
  }, [settings, taxRules, hasTaxAdvanced]);

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
    queryKey: ['pos-search', search, categoryId, branchId],
    queryFn: () => api.get('/products/search', {
      params: {
        q: search.trim(),
        limit: 48,
        category_id: categoryId || undefined,
        branch_id: branchId || undefined,
      },
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
    enabled: hasStaffPro,
  });

  const { data: heldOrders } = useQuery({
    queryKey: ['held-orders'],
    queryFn: () => api.get('/orders/held').then((r) => r.data.data),
    enabled: hasPosPro,
  });

  // Prefer employee linked to signed-in user for register session
  useEffect(() => {
    if (!registerEmployeeId && employees?.length && user?.id) {
      const linked = employees.find((e) => e.user_id === user.id);
      if (linked) setRegisterEmployeeId(linked.id);
      else setRegisterEmployeeId(employees[0].id);
    }
  }, [employees, user?.id, registerEmployeeId]);

  useEffect(() => {
    if (!branchId && branches?.length) {
      const primary = branches.find((b) => b.is_primary) || branches[0];
      if (primary) setBranchId(primary.id);
    }
  }, [branches, branchId]);

  const { data: openDrawers } = useQuery({
    queryKey: ['drawer-open', branchId],
    queryFn: () => api.get('/drawer/open', { params: { branch_id: branchId || undefined } }).then((r) => r.data.data),
    enabled: hasStaffPro,
    refetchInterval: 60_000,
  });

  const drawerSession = (openDrawers || []).find((d) => (
    branchId
      ? d.branch_id === branchId
      : (!d.branch_id || d.branch_id === null)
  )) || null;

  const { data: currentShift } = useQuery({
    queryKey: ['shifts-current', registerEmployeeId],
    queryFn: () => api.get('/shifts/current', { params: { employee_id: registerEmployeeId } }).then((r) => r.data.data),
    enabled: hasStaffPro && !!registerEmployeeId,
    refetchInterval: 60_000,
  });

  const { data: drawerSummary } = useQuery({
    queryKey: ['drawer-summary', drawerSession?.id],
    queryFn: () => api.get(`/drawer/${drawerSession.id}/summary`).then((r) => r.data.data),
    enabled: hasStaffPro && !!drawerSession?.id,
    refetchInterval: 30_000,
  });

  const requireRegister = hasStaffPro && settings?.preferences?.require_register_session !== false;
  const registerReady = Boolean(currentShift && drawerSession) && !sessionClosedLocal;
  const showRegisterGate = requireRegister && (!registerReady || forceGate);

  useEffect(() => {
    if (!currentShift && !drawerSession) setSessionClosedLocal(false);
  }, [currentShift, drawerSession]);

  const tipsEnabled = Boolean(settings?.preferences?.pos_tips_enabled || settings?.preferences?.tips_enabled);

  const flatTaxRate = parseFloat(settings?.preferences?.tax_rate) || 0;
  const taxEstimate = estimateCartTax({
    items,
    discount,
    baseRate: flatTaxRate,
    taxRules: Array.isArray(taxRules) ? taxRules : [],
    taxAdvanced: hasTaxAdvanced,
    taxExempt: Boolean(customer?.tax_exempt),
  });
  const taxAmount = taxEstimate.taxAmount;
  const displayTaxRate = taxEstimate.source === 'rules' ? taxEstimate.effectiveRate : taxRate;
  const grandTotal = subtotal - discount + taxAmount + (tipsEnabled ? tipAmount : 0);
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    if (!online || !tenant?.id) return undefined;
    const timer = setTimeout(() => {
      api.post('/pos/display', {
        items,
        subtotal,
        discount,
        taxAmount,
        grandTotal,
        customer: customer?.name || null,
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [items, subtotal, discount, taxAmount, grandTotal, customer, online, tenant?.id]);

  const buildItems = () => items.map((i) => ({
    product_id: i.product_id,
    product_name: i.product_name,
    variant_id: i.variant_id || undefined,
    quantity: i.quantity,
    discount: i.line_discount || 0,
    unit_price: i.unit_price,
    voided: i.voided || false,
    void_reason: i.void_reason || undefined,
    order_item_id: i.order_item_id || undefined,
    price_override_approved: i.price_override_approved || false,
    serial_numbers: i.serial_numbers || (i.serial_number ? [i.serial_number] : undefined),
    batch_id: i.batch_id || undefined,
    selected_modifiers: i.selected_modifiers?.length ? i.selected_modifiers : undefined,
    item_notes: i.item_notes || undefined,
  }));

  const buildRestaurantFields = () => {
    if (!hasRestaurantPro || restaurant.posMode !== 'restaurant' || !restaurant.orderType) return {};
    return {
      dining_order_type: restaurant.orderType,
      dining_session_id: restaurant.diningSessionId || undefined,
      table_id: restaurant.tableId || undefined,
      guest_count: restaurant.guestCount || undefined,
      server_employee_id: restaurant.serverEmployeeId || undefined,
      send_to_kitchen: (restaurant.kitchenSent || items.some((i) => i.kitchen_sent && !i.kitchen_status)) || undefined,
    };
  };

  const buildOrderPayload = (extra = {}) => ({
    items: buildItems(),
    discount_amount: discount,
    customer_id: customer?.id || null,
    branch_id: branchId || null,
    employee_id: registerEmployeeId || undefined,
    coupon_code: couponCode || undefined,
    tip_amount: tipsEnabled && tipAmount > 0 ? tipAmount : undefined,
    manager_employee_id: extra.manager_employee_id || undefined,
    manager_pin: extra.manager_pin || undefined,
    ...buildRestaurantFields(),
    ...extra,
  });

  const completeSaleUi = () => {
    dispatch(clearCart());
    setCustomer(null);
    setCouponCode('');
    setTipAmount(0);
    setCartOpen(false);
    setCashOpen(false);
    setCardOpen(false);
    setSplitOpen(false);
    focusBarcode();
  };

  const queueOffline = async (payload) => {
    const clientOrderId = payload.client_order_id || genClientOrderId();
    const receiptData = buildOfflineReceiptData({
      items: [...items],
      discount,
      taxAmount,
      tipAmount,
      grandTotal,
      customer,
      tenant,
      user,
      payload,
      footer: settings?.preferences?.receipt_footer,
    });
    const rec = await enqueueOrder({ ...payload, client_order_id: clientOrderId });
    completeSaleUi();
    await refreshCount();
    setOfflineReceipt({
      localId: rec.localId,
      tendered: receiptCash.tendered,
      change: receiptCash.change,
      receiptData: {
        ...receiptData,
        order: {
          ...receiptData.order,
          order_number: `OFFLINE-${String(rec.localId).slice(-8).toUpperCase()}`,
        },
      },
    });
    posNotifyWarning('Sale saved offline — PENDING SYNC (not a server receipt)');
  };

  const validateRestaurantCheckout = () => {
    if (!hasRestaurantPro || restaurant.posMode !== 'restaurant') return true;
    if (restaurant.orderType === 'dine_in') {
      if (!online) {
        posNotifyError('Restaurant table synchronization requires an online connection');
        return false;
      }
      if (!restaurant.diningSessionId) {
        posNotifyError('Select a table for dine-in orders');
        setTablePickerOpen(true);
        return false;
      }
    }
    return true;
  };

  // Single entry point for completing a sale. Queues locally when offline (or on
  // a network error) so the register keeps working; synced later automatically.
  const placeOrder = async (payload) => {
    if (!validateRestaurantCheckout()) return;
    if (requireRegister && !registerReady) {
      posNotifyError('Open the register before completing a sale');
      setForceGate(true);
      return;
    }
    const finalPayload = { ...payload, client_order_id: payload.client_order_id || genClientOrderId() };
    if (!online) {
      await queueOffline(finalPayload);
      return;
    }
    setPlacing(true);
    try {
      const res = await api.post('/orders', finalPayload);
      if (finalPayload.send_to_kitchen) {
        dispatch(markItemsKitchenSent());
        posNotifySuccess('✓ Sent to kitchen');
      }
      completeSaleUi();
      setReceiptId(res.data.data.id);
      setOfflineReceipt(null);
      queryClient.invalidateQueries(['held-orders']);
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['drawer-summary']);
    } catch (err) {
      if (!err.response) {
        await queueOffline(finalPayload);
      } else {
        posNotifyError(friendlyPosError(err, 'Checkout failed'));
      }
    } finally {
      setPlacing(false);
    }
  };

  const openRegister = async () => {
    if (!registerEmployeeId) {
      setRegisterError('Select a cashier');
      return;
    }
    setRegisterBusy(true);
    setRegisterError('');
    try {
      let session = (!sessionClosedLocal && drawerSession) || null;
      if (!session) {
        const opened = await api.post('/drawer/open', {
          branch_id: branchId || null,
          employee_id: registerEmployeeId,
          opening_float: parseFloat(openingFloat) || 0,
        });
        session = opened.data.data;
        queryClient.invalidateQueries(['drawer-open']);
      }
      const shift = (!sessionClosedLocal && currentShift) || null;
      if (!shift) {
        await api.post('/shifts/clock-in', {
          employee_id: registerEmployeeId,
          branch_id: branchId || null,
          drawer_session_id: session?.id || null,
        });
        queryClient.invalidateQueries(['shifts-current']);
        queryClient.invalidateQueries(['shifts']);
      }
      setSessionClosedLocal(false);
      setForceGate(false);
      focusBarcode();
    } catch (err) {
      setRegisterError(friendlyPosError(err, 'Could not open register'));
    } finally {
      setRegisterBusy(false);
    }
  };

  const holdMutation = useMutation({
    mutationFn: (payload) => api.post('/orders/hold', payload),
    onSuccess: () => {
      dispatch(clearCart());
      setCustomer(null);
      setCartOpen(false);
      queryClient.invalidateQueries(['held-orders']);
      focusBarcode();
      if (exitAfterHold) {
        setExitAfterHold(false);
        navigate('/dashboard');
      }
    },
    onError: (err) => {
      setExitAfterHold(false);
      posNotifyError(friendlyPosError(err, 'Could not hold sale'));
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
      setHeldOpen(false);
      if (isMobile) setCartOpen(true);
      queryClient.invalidateQueries(['held-orders']);
      focusBarcode();
    },
    onError: (err) => posNotifyError(friendlyPosError(err, 'Could not resume sale')),
  });

  const addProduct = async (p) => {
    // Variable products: open picker before stock gate (parent stock may be 0 while variants have qty)
    if (p.product_type === 'variable' && hasPosPro) {
      setVariantProductId(p.id);
      return;
    }
    if (p.stock_quantity <= 0 && !allowNegativeStock) return;

    if (hasRestaurantPro && restaurant.posMode === 'restaurant') {
      try {
        const modRes = await api.get(`/modifiers/products/${p.id}`);
        if (modRes.data.data?.length) {
          setModifierProduct(p);
          return;
        }
      } catch { /* no modifiers */ }
    }

    if (p.is_open_price && hasFeature('open_price_items')) {
      setOpenPriceProduct(p);
      setOpenPriceValue(String(p.sale_price || ''));
      return;
    }
    if (p.tracks_serials && hasFeature('catalog_pro')) {
      setSerialProduct(p);
      setSerialValue('');
      return;
    }
    if (p.tracks_batches && hasFeature('catalog_pro')) {
      setBatchProduct(p);
      setBatchId('');
      return;
    }
    dispatch(addItem({
      product_id: p.id, product_name: p.name, sku: p.sku,
      unit_price: parseFloat(p.sale_price),
      category_id: p.category_id || null,
      tax_rule_id: p.tax_rule_id || null,
      sale_price: parseFloat(p.sale_price),
    }));
    focusBarcode();
  };

  const { data: availableSerials } = useQuery({
    queryKey: ['pos-serials', serialProduct?.id],
    queryFn: () => api.get(`/products/${serialProduct.id}/serials`).then((r) => r.data.data),
    enabled: !!serialProduct?.id,
  });

  const { data: availableBatches } = useQuery({
    queryKey: ['pos-batches', batchProduct?.id],
    queryFn: () => api.get(`/products/${batchProduct.id}/batches`).then((r) => r.data.data),
    enabled: !!batchProduct?.id,
  });

  const unlockWithPin = async () => {
    if (!pinEmployeeId || pinValue.length < 4) return;
    setPinBusy(true);
    setPinError('');
    try {
      // Unlock verifies PIN only — do not replace the cashier JWT (avoids 401 / refresh corruption).
      await api.post('/employees/verify-pin', {
        employee_id: pinEmployeeId,
        pin: pinValue,
      });
      setPinLocked(false);
      try { sessionStorage.setItem('posPinLocked', '0'); } catch { /* ignore */ }
      setPinValue('');
      setPinError('');
      focusBarcode();
    } catch (err) {
      // Fallback: linked-user PIN login issues a real session (requires user_id on employee).
      try {
        const res = await api.post('/auth/pin-login', {
          employee_id: pinEmployeeId,
          pin: pinValue,
          tenant_id: tenant?.id,
          tenant_slug: tenant?.slug,
        });
        const data = res.data?.data || {};
        if (data.accessToken && data.refreshToken) {
          dispatch(setTokens({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          }));
        } else if (data.accessToken) {
          dispatch(setTokens({
            accessToken: data.accessToken,
            refreshToken: localStorage.getItem('refreshToken'),
          }));
        }
        setPinLocked(false);
        try { sessionStorage.setItem('posPinLocked', '0'); } catch { /* ignore */ }
        setPinValue('');
        setPinError('');
        focusBarcode();
      } catch (loginErr) {
        setPinError(friendlyPosError(loginErr, friendlyPosError(err, 'Invalid PIN')));
      }
    } finally {
      setPinBusy(false);
    }
  };

  const lockRegister = () => {
    setPinLocked(true);
    try { sessionStorage.setItem('posPinLocked', '1'); } catch { /* ignore */ }
  };

  const addVariantToCart = (item) => {
    dispatch(addItem({ ...item, quantity: 1 }));
    setVariantProductId(null);
    focusBarcode();
  };

  const handleBarcode = (e) => {
    if (e.key === 'Enter' && e.target.value) {
      const code = e.target.value;
      e.target.value = '';
      setLastBarcode(code);
      api.get('/products/search', { params: { q: code, limit: 1 } }).then((r) => {
        const p = r.data.data?.[0];
        if (p) {
          addProduct(p);
          setBarcodeFeedback('hit');
          setTimeout(() => setBarcodeFeedback(null), 600);
        } else {
          setBarcodeFeedback('miss');
          posNotifyError(code ? `Barcode not found: ${code}` : 'No product found for scanned barcode', {
            id: 'barcode-miss',
            title: 'Barcode not found',
          });
          setTimeout(() => setBarcodeFeedback(null), 2000);
        }
      }).catch((err) => posNotifyError(friendlyPosError(err, 'Barcode lookup failed')));
    }
  };

  const runCheckout = (payload) => {
    if (requireRegister && !registerReady) {
      posNotifyError('Open the register before completing a sale');
      setForceGate(true);
      return;
    }
    if (!validateRestaurantCheckout()) return;
    if (discount > subtotal * 0.2 && hasPosPro) {
      setPendingCheckout(payload);
      setManagerContext('checkout');
      setManagerOpen(true);
      return;
    }
    placeOrder(payload);
  };

  const handleCashConfirm = (cashInfo = {}) => {
    setReceiptCash({
      tendered: cashInfo.tendered != null ? cashInfo.tendered : null,
      change: cashInfo.change != null ? cashInfo.change : null,
    });
    runCheckout(buildOrderPayload({ payment_method: 'cash', status: 'paid' }));
  };

  const handleCardConfirm = () => {
    setReceiptCash({ tendered: null, change: null });
    runCheckout(buildOrderPayload({ payment_method: 'card', status: 'paid' }));
  };

  const handleHold = () => {
    if (!hasPosPro || !items.length) return;
    holdMutation.mutate(buildOrderPayload());
  };

  const handleSplitPay = ({ payments, cash, card }) => {
    setReceiptCash({ tendered: null, change: null });
    const splitPayments = Array.isArray(payments) && payments.length
      ? payments
      : [
          { method: 'cash', amount: cash },
          { method: 'card', amount: card },
        ].filter((p) => Number(p.amount) > 0);
    runCheckout(buildOrderPayload({
      status: 'paid',
      payments: splitPayments,
    }));
  };

  const handleGiftCardPay = ({ code, amount }) => {
    setReceiptCash({ tendered: null, change: null });
    setGiftOpen(false);
    const due = Number(grandTotal) || 0;
    if (amount + 0.02 >= due) {
      runCheckout(buildOrderPayload({
        status: 'paid',
        payment_method: 'gift_card',
        gift_card_code: code,
      }));
      return;
    }
    // Partial gift card — open split with remaining as cash suggestion
    runCheckout(buildOrderPayload({
      status: 'paid',
      payments: [
        { method: 'gift_card', amount, code },
        { method: 'cash', amount: +(due - amount).toFixed(2) },
      ],
    }));
  };

  const handleLoyaltyPay = ({ amount }) => {
    setReceiptCash({ tendered: null, change: null });
    setLoyaltyOpen(false);
    const due = Number(grandTotal) || 0;
    if (amount + 0.02 >= due) {
      runCheckout(buildOrderPayload({
        status: 'paid',
        payments: [{ method: 'loyalty', amount }],
      }));
      return;
    }
    runCheckout(buildOrderPayload({
      status: 'paid',
      payments: [
        { method: 'loyalty', amount },
        { method: 'cash', amount: +(due - amount).toFixed(2) },
      ],
    }));
  };

  const openPay = () => {
    if (!items.length) return;
    if (isMobile) setCartOpen(true);
    setCashOpen(true);
  };

  const handleEscape = () => {
    if (cashOpen) { setCashOpen(false); focusBarcode(); return; }
    if (cardOpen) { setCardOpen(false); focusBarcode(); return; }
    if (splitOpen) { setSplitOpen(false); focusBarcode(); return; }
    if (heldOpen) { setHeldOpen(false); return; }
    if (exitOpen) { setExitOpen(false); return; }
    if (managerOpen) { setManagerOpen(false); return; }
    if (variantProductId) { setVariantProductId(null); focusBarcode(); return; }
    if (openPriceProduct) { setOpenPriceProduct(null); focusBarcode(); return; }
    if (serialProduct) { setSerialProduct(null); focusBarcode(); return; }
    if (batchProduct) { setBatchProduct(null); focusBarcode(); return; }
    if (cartOpen) { setCartOpen(false); focusBarcode(); return; }
  };

  const discardAndExit = () => {
    dispatch(clearCart());
    setCustomer(null);
    setExitOpen(false);
    navigate('/dashboard');
  };

  const holdAndExit = () => {
    if (!hasPosPro) return;
    setExitAfterHold(true);
    holdMutation.mutate(buildOrderPayload());
  };

  const mapOrderItemToCart = (i) => ({
    product_id: i.product_id,
    product_name: i.product_name,
    variant_id: i.variant_id || undefined,
    unit_price: parseFloat(i.unit_price),
    quantity: i.quantity,
    line_discount: parseFloat(i.discount) || 0,
    selected_modifiers: (i.metadata?.modifiers || []).map((m) => m.option_id),
    item_notes: i.metadata?.notes || undefined,
    sku: i.sku,
    order_item_id: i.id,
    kitchen_status: i.kitchen_status || null,
  });

  const handleSessionReady = (ctx) => {
    const { orderItems, customer: sessionCustomer, ...restaurantCtx } = ctx;
    const restaurantPatch = {
      ...restaurantCtx,
      orderType: 'dine_in',
      posMode: 'restaurant',
      existingOrderId: restaurantCtx.existingOrderId ?? null,
      kitchenSent: false,
    };
    if (orderItems?.length) {
      dispatch(loadCart({
        items: orderItems.map(mapOrderItemToCart),
        discount: 0,
        notes: '',
        restaurant: { ...restaurant, ...restaurantPatch },
      }));
    } else {
      dispatch(clearCart());
      dispatch(setRestaurantContext(restaurantPatch));
    }
    setCustomer(sessionCustomer || null);
    setTablePickerOpen(false);
    posNotifySuccess(
      restaurantPatch.existingOrderId
        ? `✓ Loaded order for ${restaurantPatch.tableName || 'table'}`
        : `✓ ${restaurantPatch.tableName || 'Table'} ready — add items to start the order`
    );
    focusBarcode();
  };

  const handleRestaurantOrderType = (type) => {
    dispatch(setRestaurantOrderType(type));
    if (type === 'dine_in' && !restaurant.diningSessionId) {
      setTablePickerOpen(true);
    }
  };

  const handleSendToKitchen = async () => {
    if (!validateRestaurantCheckout()) return;
    if (!online) {
      posNotifyError('Send to kitchen requires an online connection');
      setKitchenDialogOpen(false);
      return;
    }
    const unsentItems = items.filter((i) => !i.voided && (!i.kitchen_status || i.kitchen_status === 'not_sent'));
    if (!unsentItems.length) {
      posNotifySuccess('No unsent items');
      setKitchenDialogOpen(false);
      return;
    }

    setSendKitchenPending(true);
    try {
      let orderId = restaurant.existingOrderId;
      let orderItemIds = items
        .filter((i) => !i.voided && i.order_item_id)
        .map((i) => i.order_item_id);

      if (!orderId) {
        const holdRes = await api.post('/orders/hold', buildOrderPayload());
        orderId = holdRes.data.data.id;
        orderItemIds = (holdRes.data.data.items || []).map((i) => i.id);
        dispatch(syncOrderItemIds({
          orderId,
          items: holdRes.data.data.items || [],
        }));
      } else {
        const newCartItems = items.filter((i) => !i.voided && !i.order_item_id);
        if (newCartItems.length) {
          const appendRes = await api.post(`/restaurant/orders/${orderId}/items`, {
            items: buildItems(newCartItems),
          });
          const appendedIds = (appendRes.data.data.items || []).map((i) => i.id);
          orderItemIds = [...orderItemIds, ...appendedIds];
          dispatch(syncOrderItemIds({
            orderId,
            items: appendRes.data.data.items || [],
          }));
        }
      }

      const unsentIds = orderItemIds.filter((id) => {
        const line = items.find((i) => i.order_item_id === id);
        return !line?.kitchen_status || line.kitchen_status === 'not_sent';
      });
      // Include newly created items (not yet in cart state with kitchen_status)
      const newIds = orderItemIds.filter((id) => !items.some((i) => i.order_item_id === id));
      const itemIds = [...new Set([...unsentIds, ...newIds])];

      const sendRes = await api.post(`/restaurant/orders/${orderId}/kitchen/send`, {
        item_ids: itemIds.length ? itemIds : undefined,
        branch_id: branchId || undefined,
      });

      dispatch(applyKitchenStatuses(sendRes.data.data.item_statuses || {}));
      dispatch(setRestaurantContext({ existingOrderId: orderId }));
      setKitchenDialogOpen(false);
      posNotifySuccess(`✓ ${sendRes.data.data.tickets?.length || 0} ticket(s) sent to kitchen`);
      queryClient.invalidateQueries(['restaurant-tables']);
    } catch (err) {
      posNotifyError(friendlyPosError(err, 'Could not send to kitchen'));
    } finally {
      setSendKitchenPending(false);
    }
  };

  const quickKeys = settings?.preferences?.pos_quick_keys || [];

  const cartProps = {
    items,
    discount,
    taxRate: displayTaxRate,
    subtotal,
    taxAmount,
    tipAmount: tipsEnabled ? tipAmount : 0,
    grandTotal,
    onDiscountChange: (v) => dispatch(setDiscount(v)),
    onTipChange: setTipAmount,
    showTip: tipsEnabled,
    onLineDiscountChange: (idx, v) => dispatch(setLineDiscount({ index: idx, discount: v })),
    onQtyChange: (idx, qty) => dispatch(updateQuantity({ index: idx, quantity: qty })),
    onRemove: (idx) => dispatch(removeItem(idx)),
    onVoidLine: (idx) => {
      if (!hasPosPro) {
        dispatch(removeItem(idx));
        return;
      }
      setManagerContext('void');
      setPendingVoidIndex(idx);
      setManagerOpen(true);
    },
    onPriceOverride: (idx) => {
      const line = items[idx];
      if (!line || line.voided) return;
      setPendingPriceIndex(idx);
      setPendingPriceValue(String(line.unit_price ?? ''));
      setPriceOverrideOpen(true);
    },
    onCash: () => setCashOpen(true),
    onCard: () => setCardOpen(true),
    onSplitOpen: () => setSplitOpen(true),
    onGiftCard: () => setGiftOpen(true),
    onLoyalty: () => setLoyaltyOpen(true),
    showGiftCard: true,
    showLoyalty: Boolean(customer?.id),
    onHold: handleHold,
    checkoutPending: placing,
    holdPending: holdMutation.isPending,
    customer,
    onCustomerChange: setCustomer,
    customers,
    customerInputRef,
    branchId,
    onBranchChange: setBranchId,
    branches,
    formatMoney,
    currency,
    hasPosPro,
    moneyLabel,
    couponCode,
    onCouponChange: setCouponCode,
    showCoupon: hasFeature('catalog_pro'),
    showSendToKitchen: hasRestaurantPro && restaurant.posMode === 'restaurant' && items.some((i) => !i.voided),
    kitchenSent: items.some((i) => i.kitchen_status && i.kitchen_status !== 'not_sent'),
    sendKitchenPending,
    onSendToKitchen: () => setKitchenDialogOpen(true),
  };

  const registerCashier = (employees || []).find((e) => e.id === registerEmployeeId);
  const managerList = managerEmployees(employees);
  const registerLabel = registerReady
    ? `${employeeLabel(registerCashier) || 'Cashier'} · open`
    : 'Closed';

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        background: 'var(--codex-bg, var(--mantine-color-body))',
        position: 'relative',
      }}
    >
      {hasStaffPro && pinLocked && (
        <PinLockOverlay
          employees={employees}
          pinEmployeeId={pinEmployeeId}
          pinValue={pinValue}
          pinError={pinError}
          pinBusy={pinBusy}
          onEmployeeChange={setPinEmployeeId}
          onPinChange={setPinValue}
          onUnlock={unlockWithPin}
        />
      )}

      {showRegisterGate && !pinLocked && (
        <RegisterGate
          open
          employees={employees}
          branches={branches}
          employeeId={registerEmployeeId}
          branchId={branchId}
          openingFloat={openingFloat}
          onEmployeeChange={setRegisterEmployeeId}
          onBranchChange={setBranchId}
          onOpeningFloatChange={setOpeningFloat}
          onOpenRegister={openRegister}
          pending={registerBusy}
          error={registerError}
          formatMoney={formatMoney}
        />
      )}

      <POSHeader
        businessName={tenant?.name}
        userName={user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : ''}
        branchId={branchId}
        branches={branches}
        onBranchChange={setBranchId}
        online={online}
        pending={pending}
        syncing={syncing}
        hasPosPro={hasPosPro}
        hasStaffPro={hasStaffPro}
        heldCount={heldOrders?.length || 0}
        registerOpen={registerReady}
        registerLabel={registerLabel}
        expectedCashLabel={drawerSummary ? formatMoney(drawerSummary.expected_cash) : ''}
        onOpenHeld={() => setHeldOpen(true)}
        onLock={lockRegister}
        onExit={() => setExitOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenCustomer={focusCustomer}
        onOpenCashManagement={() => setCashMgmtOpen(true)}
        onOpenReceiptHistory={() => setReceiptHistoryOpen(true)}
        onOpenReturns={() => setReturnsOpen(true)}
        onOpenXReport={() => { setCloseRegMode('x'); setCloseRegOpen(true); }}
        onCloseRegister={() => { setCloseRegMode('close'); setCloseRegOpen(true); }}
        onOpenHardware={() => setHardwareOpen(true)}
        onOpenOfflineQueue={() => setOfflineQueueOpen(true)}
        onOpenRegisterMenu={() => setForceGate(true)}
        restaurantModeSelector={hasRestaurantPro ? (
          <RestaurantModeSelector
            posMode={restaurant.posMode}
            onPosModeChange={handlePosModeChange}
            disabled={pinLocked || showRegisterGate}
          />
        ) : null}
      />

      {hasRestaurantPro && restaurant.posMode === 'restaurant' && (
        <RestaurantContextBar
          restaurant={restaurant}
          onOrderTypeChange={handleRestaurantOrderType}
          onChangeTable={() => setTablePickerOpen(true)}
          onClearTable={() => dispatch(clearRestaurantTable())}
          formatGuestLabel={(n) => `${n} guest${n === 1 ? '' : 's'}`}
          modeSelector={(
            <RestaurantModeSelector
              posMode={restaurant.posMode}
              onPosModeChange={handlePosModeChange}
              disabled={pinLocked || showRegisterGate}
            />
          )}
        />
      )}

      {!online && hasRestaurantPro && restaurant.posMode === 'restaurant' && restaurant.orderType === 'dine_in' && (
        <Alert color="yellow" radius={0} py={6}>
          Restaurant table synchronization requires an online connection.
        </Alert>
      )}

      {!online && (
        <Alert color="yellow" radius={0} py={6}>
          You are offline. Sales are saved on this device and sync when connection returns.
        </Alert>
      )}

      <Box
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <Box
          p={isMobile ? 'sm' : 'md'}
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            overflow: 'hidden',
          }}
        >
          <POSSearch
            ref={barcodeRef}
            searchInputRef={searchInputRef}
            search={search}
            onSearchChange={setSearch}
            onBarcodeKeyDown={handleBarcode}
            disabled={pinLocked || showRegisterGate}
            barcodeFeedback={barcodeFeedback}
            onClearBarcodeFeedback={() => setBarcodeFeedback(null)}
          />

          <CategoryBar
            categories={categories}
            categoryId={categoryId}
            onChange={setCategoryId}
            quickKeys={hasPosPro ? quickKeys : []}
            onQuickKey={(key) => {
              const p = (products || []).find((x) => x.id === (key.product_id || key.id));
              if (p) addProduct(p);
            }}
          />

          <Box style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingBottom: isMobile ? 80 : 0 }}>
            <ProductGrid
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
              allowNegativeStock={allowNegativeStock}
            />
          </Box>
        </Box>

        {!isMobile && (
          <Box
            p="md"
            style={{
              width: 400,
              maxWidth: '42vw',
              flexShrink: 0,
              borderLeft: '1px solid var(--mantine-color-default-border)',
              background: 'var(--codex-surface, var(--mantine-color-body))',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <CartPanel {...cartProps} />
          </Box>
        )}
      </Box>

      {isMobile && (
        <>
          <Affix position={{ bottom: 24, right: 24 }} zIndex={1200}>
            <ActionIcon
              size={56}
              radius="xl"
              color="codex"
              variant="filled"
              onClick={() => setCartOpen(true)}
              aria-label="Open cart"
              style={{ boxShadow: 'var(--mantine-shadow-md)' }}
            >
              <Box pos="relative">
                <ShoppingCart />
                {cartCount > 0 && (
                  <Box
                    component="span"
                    style={{
                      position: 'absolute',
                      top: -10,
                      right: -12,
                      minWidth: 20,
                      height: 20,
                      borderRadius: 999,
                      background: 'var(--mantine-color-red-6)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingInline: 4,
                    }}
                  >
                    {cartCount}
                  </Box>
                )}
              </Box>
            </ActionIcon>
          </Affix>
          <Drawer
            opened={cartOpen}
            onClose={() => { setCartOpen(false); focusBarcode(); }}
            position="bottom"
            size="92dvh"
            padding="md"
            radius="md"
            title="Current sale"
            styles={{
              content: {
                display: 'flex',
                flexDirection: 'column',
              },
              body: {
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              },
            }}
          >
            <CartPanel {...cartProps} compact />
          </Drawer>
        </>
      )}

      <CashPaymentDialog
        open={cashOpen}
        onClose={() => { setCashOpen(false); focusBarcode(); }}
        onConfirm={handleCashConfirm}
        grandTotal={subtotal - discount + taxAmount}
        tipAmount={tipsEnabled ? tipAmount : 0}
        formatMoney={formatMoney}
        moneyLabel={moneyLabel}
        pending={placing}
      />

      <CardPaymentDialog
        open={cardOpen}
        onClose={() => { setCardOpen(false); focusBarcode(); }}
        onConfirm={handleCardConfirm}
        grandTotal={grandTotal}
        formatMoney={formatMoney}
        pending={placing}
      />

      <SplitPaymentDialog
        open={splitOpen}
        onClose={() => { setSplitOpen(false); focusBarcode(); }}
        onConfirm={handleSplitPay}
        grandTotal={grandTotal}
        formatMoney={formatMoney}
        moneyLabel={moneyLabel}
        pending={placing}
      />

      <GiftCardPaymentDialog
        open={giftOpen}
        onClose={() => { setGiftOpen(false); focusBarcode(); }}
        onConfirm={handleGiftCardPay}
        grandTotal={grandTotal}
        formatMoney={formatMoney}
        pending={placing}
      />

      <LoyaltyPaymentDialog
        open={loyaltyOpen}
        onClose={() => { setLoyaltyOpen(false); focusBarcode(); }}
        onConfirm={handleLoyaltyPay}
        grandTotal={grandTotal}
        formatMoney={formatMoney}
        customer={customer}
        pending={placing}
      />

      {hasPosPro && (
        <HeldSalesDialog
          open={heldOpen}
          onClose={() => setHeldOpen(false)}
          heldOrders={heldOrders}
          formatMoney={formatMoney}
          onResume={(id) => setResumeId(id)}
          resumePending={resumeMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!resumeId}
        title="Resume held sale?"
        message="This will load the held sale back into your cart so you can complete checkout."
        onConfirm={() => resumeMutation.mutate(resumeId)}
        onCancel={() => setResumeId(null)}
        loading={resumeMutation.isPending}
        confirmLabel="Resume"
      />

      <SaleSuccessDialog
        orderId={receiptId}
        open={!!receiptId || !!offlineReceipt}
        offline={Boolean(offlineReceipt) && !receiptId}
        offlineLocalId={offlineReceipt?.localId}
        offlineReceiptData={offlineReceipt?.receiptData}
        cashTendered={offlineReceipt?.tendered ?? receiptCash.tendered}
        changeAmount={offlineReceipt?.change ?? receiptCash.change}
        onClose={() => {
          setReceiptId(null);
          setOfflineReceipt(null);
          setReceiptCash({ tendered: null, change: null });
        }}
        onNewSale={() => {
          setReceiptId(null);
          setOfflineReceipt(null);
          setReceiptCash({ tendered: null, change: null });
          focusBarcode();
        }}
      />

      <CashManagementDialog
        open={cashMgmtOpen}
        onClose={() => setCashMgmtOpen(false)}
        sessionId={drawerSession?.id}
        formatMoney={formatMoney}
      />

      <CloseRegisterDialog
        open={closeRegOpen}
        onClose={() => setCloseRegOpen(false)}
        mode={closeRegMode}
        shiftId={currentShift?.id}
        drawerSessionId={drawerSession?.id}
        formatMoney={formatMoney}
        onClosed={() => {
          setSessionClosedLocal(true);
          setForceGate(true);
          queryClient.invalidateQueries(['drawer-open']);
          queryClient.invalidateQueries(['shifts-current']);
        }}
      />

      <ReceiptHistoryDialog
        open={receiptHistoryOpen}
        onClose={() => setReceiptHistoryOpen(false)}
        formatMoney={formatMoney}
        branchId={branchId}
        onSelectOrder={(id) => {
          setReceiptHistoryOpen(false);
          setOfflineReceipt(null);
          setReceiptId(id);
        }}
      />

      <ReturnRefundDialog
        open={returnsOpen}
        onClose={() => setReturnsOpen(false)}
        formatMoney={formatMoney}
        managerEmployees={managerList}
        returnManagerThreshold={parseFloat(settings?.preferences?.pos_return_manager_threshold) || 100}
        onComplete={() => {
          posNotifySuccess('Return processed');
          queryClient.invalidateQueries(['orders']);
          queryClient.invalidateQueries(['drawer-summary']);
        }}
      />

      <OfflineQueueDialog
        open={offlineQueueOpen}
        onClose={() => setOfflineQueueOpen(false)}
        formatMoney={formatMoney}
        syncing={syncing}
        onRetrySync={() => flush?.()}
        onRetrySingle={(localId) => flushSingle?.(localId)}
        onOpenSyncedReceipt={(orderId) => {
          setOfflineQueueOpen(false);
          setOfflineReceipt(null);
          setReceiptId(orderId);
        }}
      />

      <HardwareDialog open={hardwareOpen} onClose={() => setHardwareOpen(false)} />

      <VariantPickerDialog
        productId={variantProductId}
        open={!!variantProductId}
        onClose={() => { setVariantProductId(null); focusBarcode(); }}
        onSelect={addVariantToCart}
        formatMoney={formatMoney}
      />

      <ExitPOSDialog
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        onContinue={() => { setExitOpen(false); navigate('/dashboard'); }}
        onHoldAndExit={holdAndExit}
        onDiscardAndExit={discardAndExit}
        hasItems={items.length > 0}
        canHold={hasPosPro}
        holdPending={holdMutation.isPending}
      />

      <POSKeyboardShortcuts
        enabled={!pinLocked && !showRegisterGate}
        onFocusSearch={focusSearch}
        onFocusCustomer={focusCustomer}
        onHold={handleHold}
        onPay={openPay}
        onEscape={handleEscape}
        canHold={hasPosPro && items.length > 0}
        helpOpen={helpOpen}
        onHelpOpenChange={setHelpOpen}
      />

      {hasRestaurantPro && (
        <>
          <TablePickerDialog
            open={tablePickerOpen}
            onClose={() => setTablePickerOpen(false)}
            branchId={branchId}
            onSessionReady={handleSessionReady}
            employees={employees || []}
            customers={customers || []}
            defaultGuestCount={restaurantSettings?.default_guest_count || 2}
            online={online}
          />
          <ModifierPickerDialog
            open={!!modifierProduct}
            product={modifierProduct}
            onClose={() => { setModifierProduct(null); focusBarcode(); }}
            onConfirm={(item) => { dispatch(addItem(item)); focusBarcode(); }}
            formatMoney={formatMoney}
          />
          <SendToKitchenDialog
            open={kitchenDialogOpen}
            onClose={() => setKitchenDialogOpen(false)}
            onConfirm={handleSendToKitchen}
            items={items}
            formatMoney={formatMoney}
            pending={sendKitchenPending}
          />
        </>
      )}

      <ManagerOverrideDialog
        open={managerOpen}
        onClose={() => {
          setManagerOpen(false);
          setPendingVoidIndex(null);
          setPendingPriceIndex(null);
        }}
        employees={managerList}
        employeeId={managerEmployeeId}
        pin={managerPin}
        onEmployeeChange={setManagerEmployeeId}
        onPinChange={setManagerPin}
        message={
          managerContext === 'void'
            ? 'Manager approval required to void this item.'
            : managerContext === 'price'
              ? 'Manager approval required for price override.'
              : 'Discount exceeds 20%. Select a manager and enter PIN.'
        }
        onApprove={async () => {
          if (!managerEmployeeId || managerPin.length < 4) return;
          try {
            await api.post('/employees/verify-pin', { employee_id: managerEmployeeId, pin: managerPin });
            if (managerContext === 'void' && pendingVoidIndex != null) {
              dispatch(voidLine({
                index: pendingVoidIndex,
                reason: 'Manager void',
                authorizedBy: managerEmployeeId,
              }));
            } else if (managerContext === 'price' && pendingPriceIndex != null) {
              const price = parseFloat(pendingPriceValue);
              if (Number.isFinite(price) && price >= 0) {
                dispatch(setLinePrice({
                  index: pendingPriceIndex,
                  unit_price: price,
                  reason: 'Manager override',
                  authorizedBy: managerEmployeeId,
                }));
              }
              setPriceOverrideOpen(false);
            } else if (pendingCheckout) {
              placeOrder(buildOrderPayload({
                ...pendingCheckout,
                manager_employee_id: managerEmployeeId,
                manager_pin: managerPin,
              }));
              setPendingCheckout(null);
            }
            setManagerOpen(false);
            setManagerPin('');
            setManagerEmployeeId('');
            setPendingVoidIndex(null);
            setPendingPriceIndex(null);
            setManagerContext('checkout');
          } catch (err) {
            posNotifyError(friendlyPosError(err, 'PIN verification failed'));
          }
        }}
      />

      <CodexModal
        opened={priceOverrideOpen}
        onClose={() => setPriceOverrideOpen(false)}
        size="sm"
        title="Override price"
      >
        <Stack gap="md">
          {pendingPriceIndex != null && items[pendingPriceIndex] && (
            <Text size="sm" c="dimmed">
              {items[pendingPriceIndex].product_name}
            </Text>
          )}
          <CodexInput
            type="number"
            label="New unit price"
            value={pendingPriceValue}
            onChange={(e) => setPendingPriceValue(e.target.value)}
            min={0}
            step={0.01}
          />
          <Group justify="flex-end" gap="sm">
            <CodexButton variant="default" onClick={() => setPriceOverrideOpen(false)} touch>
              Cancel
            </CodexButton>
            <CodexButton
              color="codex"
              touch
              onClick={() => {
                const price = parseFloat(pendingPriceValue);
                if (!Number.isFinite(price) || price < 0) return;
                const line = items[pendingPriceIndex];
                const catalog = parseFloat(line?.catalog_price ?? line?.sale_price ?? line?.unit_price);
                if (hasPosPro && Math.abs(price - catalog) > 0.001 && !line?.open_price) {
                  setPriceOverrideOpen(false);
                  setManagerContext('price');
                  setManagerOpen(true);
                  return;
                }
                dispatch(setLinePrice({
                  index: pendingPriceIndex,
                  unit_price: price,
                  reason: 'Cashier override',
                  authorizedBy: user?.id,
                }));
                setPriceOverrideOpen(false);
              }}
            >
              Apply
            </CodexButton>
          </Group>
        </Stack>
      </CodexModal>

      <CodexModal
        opened={!!openPriceProduct}
        onClose={() => { setOpenPriceProduct(null); focusBarcode(); }}
        size="sm"
        title={`Set price — ${openPriceProduct?.name || ''}`}
      >
        <Stack gap="md">
          <CodexInput
            type="number"
            label="Sale price"
            value={openPriceValue}
            onChange={(e) => setOpenPriceValue(e.target.value)}
            min={0}
            step={0.01}
          />
          <Group justify="flex-end" gap="sm">
            <CodexButton variant="default" onClick={() => { setOpenPriceProduct(null); focusBarcode(); }} touch>
              Cancel
            </CodexButton>
            <CodexButton
              color="codex"
              touch
              onClick={() => {
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
              }}
            >
              Add to cart
            </CodexButton>
          </Group>
        </Stack>
      </CodexModal>

      <CodexModal
        opened={!!serialProduct}
        onClose={() => { setSerialProduct(null); focusBarcode(); }}
        size="sm"
        title={`Serial number — ${serialProduct?.name || ''}`}
      >
        <Stack gap="md">
          <CodexInput
            autoFocus
            label="Serial number"
            value={serialValue}
            onChange={(e) => setSerialValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && serialValue.trim()) {
                dispatch(addItem({
                  product_id: serialProduct.id,
                  product_name: serialProduct.name,
                  sku: serialProduct.sku,
                  unit_price: parseFloat(serialProduct.sale_price),
                  serial_number: serialValue.trim(),
                  serial_numbers: [serialValue.trim()],
                  quantity: 1,
                }));
                setSerialProduct(null);
                focusBarcode();
              }
            }}
          />
          {(availableSerials || []).filter((s) => s.status === 'available' || !s.status || s.status === 'in_stock').length > 0 && (
            <List spacing="xs" style={{ maxHeight: 200, overflow: 'auto' }}>
              {(availableSerials || [])
                .filter((s) => s.status === 'available' || s.status === 'in_stock' || !s.status)
                .slice(0, 20)
                .map((s) => (
                  <List.Item
                    key={s.id}
                    style={{ minHeight: 44, cursor: 'pointer', padding: '8px 4px' }}
                    onClick={() => {
                      dispatch(addItem({
                        product_id: serialProduct.id,
                        product_name: serialProduct.name,
                        sku: serialProduct.sku,
                        unit_price: parseFloat(serialProduct.sale_price),
                        serial_number: s.serial_number,
                        serial_numbers: [s.serial_number],
                        quantity: 1,
                      }));
                      setSerialProduct(null);
                      focusBarcode();
                    }}
                  >
                    <Text size="sm" fw={600}>{s.serial_number}</Text>
                    <Text size="xs" c="dimmed">{s.status}</Text>
                  </List.Item>
                ))}
            </List>
          )}
          <Group justify="flex-end" gap="sm">
            <CodexButton variant="default" onClick={() => { setSerialProduct(null); focusBarcode(); }} touch>
              Cancel
            </CodexButton>
            <CodexButton
              color="codex"
              disabled={!serialValue.trim()}
              touch
              onClick={() => {
                dispatch(addItem({
                  product_id: serialProduct.id,
                  product_name: serialProduct.name,
                  sku: serialProduct.sku,
                  unit_price: parseFloat(serialProduct.sale_price),
                  serial_number: serialValue.trim(),
                  serial_numbers: [serialValue.trim()],
                  quantity: 1,
                }));
                setSerialProduct(null);
                focusBarcode();
              }}
            >
              Add
            </CodexButton>
          </Group>
        </Stack>
      </CodexModal>

      <CodexModal
        opened={!!batchProduct}
        onClose={() => { setBatchProduct(null); focusBarcode(); }}
        size="sm"
        title={`Select batch — ${batchProduct?.name || ''}`}
      >
        <Stack gap="md">
          <CodexSelect
            label="Batch"
            value={batchId || 'none'}
            onChange={(v) => setBatchId(!v || v === 'none' ? '' : v)}
            data={[
              { value: 'none', label: 'No batch / skip' },
              ...(availableBatches || []).map((b) => ({
                value: b.id,
                label: `${b.batch_number} · qty ${b.quantity}${b.expiry_date ? ` · exp ${new Date(b.expiry_date).toLocaleDateString()}` : ''}`,
              })),
            ]}
          />
          <Group justify="flex-end" gap="sm">
            <CodexButton variant="default" onClick={() => { setBatchProduct(null); focusBarcode(); }} touch>
              Cancel
            </CodexButton>
            <CodexButton
              color="codex"
              touch
              onClick={() => {
                const batch = (availableBatches || []).find((b) => b.id === batchId);
                dispatch(addItem({
                  product_id: batchProduct.id,
                  product_name: batchProduct.name,
                  sku: batchProduct.sku,
                  unit_price: parseFloat(batchProduct.sale_price),
                  batch_id: batchId || undefined,
                  batch_number: batch?.batch_number,
                }));
                setBatchProduct(null);
                focusBarcode();
              }}
            >
              Add to cart
            </CodexButton>
          </Group>
        </Stack>
      </CodexModal>
    </Box>
  );
}
