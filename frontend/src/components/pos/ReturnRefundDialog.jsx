import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Stack, Group, Text, Alert, Checkbox, Divider, Loader, Box, NumberInput,
} from '@mantine/core';
import { AssignmentReturn } from '@mui/icons-material';
import { CodexModal, CodexButton, CodexInput, CodexSelect } from '../../design-system';
import api from '../../services/api';
import { friendlyPosError } from './posErrors';

/**
 * Lookup a paid order and submit a partial/full return via existing POST /orders/:id/return.
 * UI only — refund payload / manager threshold logic unchanged.
 */
export default function ReturnRefundDialog({
  open,
  onClose,
  formatMoney,
  onComplete,
  managerEmployees = [],
  returnManagerThreshold = 100,
}) {
  const [lookup, setLookup] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [selected, setSelected] = useState({});
  const [reason, setReason] = useState('');
  const [restock, setRestock] = useState(true);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [managerEmployeeId, setManagerEmployeeId] = useState('');
  const [managerPin, setManagerPin] = useState('');

  useEffect(() => {
    if (!open) {
      setLookup('');
      setOrderId(null);
      setSelected({});
      setReason('');
      setError('');
      setManagerEmployeeId('');
      setManagerPin('');
    }
  }, [open]);

  const { data: order, isLoading } = useQuery({
    queryKey: ['pos-return-order', orderId],
    queryFn: () => api.get(`/orders/${orderId}`).then((r) => r.data.data),
    enabled: open && !!orderId,
  });

  const findOrder = async () => {
    setError('');
    setOrderId(null);
    setSelected({});
    const term = lookup.trim();
    if (!term) return;
    setSearching(true);
    try {
      // UUID paste
      if (/^[0-9a-f-]{36}$/i.test(term)) {
        setOrderId(term);
        return;
      }
      const res = await api.get('/orders', { params: { search: term, limit: 5 } });
      const rows = res.data.data || [];
      const match = rows.find((o) => String(o.order_number).toLowerCase() === term.toLowerCase())
        || rows[0];
      if (!match) {
        setError('Order not found');
        return;
      }
      if (!['paid', 'completed'].includes(match.status)) {
        setError(`Order status is ${match.status} — only paid/completed orders can be returned`);
        return;
      }
      setOrderId(match.id);
    } catch (err) {
      setError(friendlyPosError(err, 'Lookup failed'));
    } finally {
      setSearching(false);
    }
  };

  const returnMutation = useMutation({
    mutationFn: (payload) => api.post(`/orders/${orderId}/return`, payload),
    onSuccess: (res) => {
      onComplete?.(res.data.data);
      onClose();
    },
    onError: (err) => setError(friendlyPosError(err, 'Return failed')),
  });

  const items = order?.items || [];
  const toggle = (itemId, maxQty) => {
    setSelected((prev) => {
      if (prev[itemId]) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: maxQty };
    });
  };

  const remainingQty = (item) => {
    const returned = parseInt(item.returned_quantity, 10) || 0;
    return Math.max(0, (item.quantity || 0) - returned);
  };

  const setQty = (itemId, qty, max) => {
    const n = Math.max(1, Math.min(max, parseInt(qty, 10) || 1));
    setSelected((prev) => ({ ...prev, [itemId]: n }));
  };

  const refundEstimate = items.reduce((sum, item) => {
    const qty = selected[item.id];
    if (!qty) return sum;
    const unit = (parseFloat(item.total) || 0) / (item.quantity || 1);
    return sum + unit * qty;
  }, 0);

  const needsManagerAuth = returnManagerThreshold > 0 && refundEstimate > returnManagerThreshold;

  const submit = () => {
    const entries = Object.entries(selected);
    if (!entries.length) {
      setError('Select at least one item to return');
      return;
    }
    if (needsManagerAuth && (!managerEmployeeId || managerPin.length < 4)) {
      setError(`Refund exceeds ${formatMoney(returnManagerThreshold)} — manager PIN required`);
      return;
    }
    returnMutation.mutate({
      items: entries.map(([order_item_id, quantity]) => ({ order_item_id, quantity })),
      reason: reason || undefined,
      restock,
      manager_employee_id: needsManagerAuth ? managerEmployeeId : undefined,
      manager_pin: needsManagerAuth ? managerPin : undefined,
    });
  };

  const managerOptions = (managerEmployees || []).map((e) => ({
    value: String(e.id),
    label: e.name || e.email || String(e.id),
  }));

  return (
    <CodexModal
      opened={open}
      onClose={returnMutation.isPending ? () => {} : onClose}
      closeOnClickOutside={!returnMutation.isPending}
      closeOnEscape={!returnMutation.isPending}
      size="md"
      title={(
        <Group gap="xs">
          <AssignmentReturn />
          <span>Returns / refunds</span>
        </Group>
      )}
    >
      <Stack gap="md">
        {error && (
          <Alert color="red" withCloseButton onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Group align="flex-end" gap="sm" wrap="nowrap">
          <CodexInput
            style={{ flex: 1 }}
            label="Order number or ID"
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') findOrder(); }}
          />
          <CodexButton
            variant="default"
            onClick={findOrder}
            disabled={searching}
            touch
            style={{ minWidth: 100 }}
          >
            {searching ? <Loader size="sm" /> : 'Find'}
          </CodexButton>
        </Group>

        {orderId && isLoading && (
          <Box py="xl" ta="center">
            <Loader size="md" />
          </Box>
        )}

        {order && (
          <>
            <Text size="sm" fw={600}>
              {order.order_number}
              {' '}
              ·
              {' '}
              {formatMoney(order.total_amount)}
              {' '}
              ·
              {' '}
              {order.payment_method || '—'}
            </Text>
            {order.payments?.length > 0 && (
              <Alert color="blue">
                Tenders:
                {' '}
                {order.payments.map((p) => `${p.payment_method} ${formatMoney(p.amount)}`).join(' · ')}
              </Alert>
            )}
            {order.status === 'refunded' && (
              <Alert color="blue">This order is fully refunded.</Alert>
            )}
            <Divider />
            {items.every((item) => remainingQty(item) < 1) ? (
              <Alert color="blue">All items on this order have already been returned.</Alert>
            ) : null}
            {items.map((item) => {
              const maxReturn = remainingQty(item);
              if (maxReturn < 1) return null;
              const checked = selected[item.id] != null;
              return (
                <Group key={item.id} gap="sm" wrap="nowrap" align="center">
                  <Checkbox
                    checked={checked}
                    onChange={() => toggle(item.id, maxReturn)}
                    aria-label={`Select ${item.product_name}`}
                  />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" truncate>
                      {item.product_name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Returnable
                      {' '}
                      {maxReturn}
                      {' '}
                      of
                      {' '}
                      {item.quantity}
                      {' '}
                      ·
                      {' '}
                      {formatMoney(item.total)}
                      {(item.returned_quantity || 0) > 0 ? ` · already returned ${item.returned_quantity}` : ''}
                    </Text>
                  </Box>
                  {checked && (
                    <NumberInput
                      value={selected[item.id]}
                      onChange={(v) => setQty(item.id, v, maxReturn)}
                      min={1}
                      max={maxReturn}
                      allowDecimal={false}
                      w={72}
                      styles={{ input: { minHeight: 44 } }}
                    />
                  )}
                </Group>
              );
            })}
            <CodexInput
              label="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Checkbox
              checked={restock}
              onChange={(e) => setRestock(e.currentTarget.checked)}
              label="Restock returned items"
            />
            <Alert color="blue">
              Estimated refund:
              {' '}
              {formatMoney(refundEstimate)}
              . Cash refunds reduce expected drawer cash.
              Card gateway refunds are not automatic unless configured.
            </Alert>
            {needsManagerAuth && (
              <>
                <Alert color="yellow">
                  Refund exceeds
                  {' '}
                  {formatMoney(returnManagerThreshold)}
                  {' '}
                  — manager approval required.
                </Alert>
                <CodexSelect
                  label="Manager"
                  data={managerOptions}
                  value={managerEmployeeId ? String(managerEmployeeId) : null}
                  onChange={(v) => setManagerEmployeeId(v || '')}
                  placeholder="Select manager"
                  searchable
                />
                <CodexInput
                  type="password"
                  label="Manager PIN"
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  maxLength={20}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </>
            )}
          </>
        )}

        <Divider />

        <Group justify="flex-end" gap="sm">
          <CodexButton variant="default" onClick={onClose} disabled={returnMutation.isPending} touch>
            Cancel
          </CodexButton>
          <CodexButton
            color="yellow"
            disabled={!order || returnMutation.isPending || !Object.keys(selected).length}
            onClick={submit}
            touch
          >
            {returnMutation.isPending ? 'Processing…' : 'Process return'}
          </CodexButton>
        </Group>
      </Stack>
    </CodexModal>
  );
}
