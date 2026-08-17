import { useEffect, useMemo, useState } from 'react';
import { Stack, Text, Group, Box, Alert, Divider } from '@mantine/core';
import { CallSplit, CheckCircleOutline, ErrorOutline, WarningAmber } from '@mui/icons-material';
import { CodexModal, CodexButton, CodexInput } from '../../design-system';
import { formatDisplayText } from '../../utils/displayText';
import { roundMoney, safeNumber } from '../../utils/currency';

/** Matches backend split-payment equality tolerance. */
const BALANCE_TOLERANCE = 0.02;

const DEFAULT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
];

/** Equal split across methods; last share absorbs remainder so sum === due. */
export function initialAmounts(methods, grandTotal) {
  const due = roundMoney(grandTotal);
  const n = methods.length;
  const amounts = {};
  if (n === 0) return amounts;

  const base = n > 1 ? roundMoney(due / n) : due;
  let allocated = 0;
  methods.forEach((m, idx) => {
    if (idx === n - 1) {
      const rest = roundMoney(due - allocated);
      amounts[m.id] = rest >= 0 ? rest.toFixed(2) : '0.00';
    } else {
      amounts[m.id] = base >= 0 ? base.toFixed(2) : '0.00';
      allocated = roundMoney(allocated + base);
    }
  });
  return amounts;
}

/**
 * True when the draft can drive peer balancing.
 * Allows "", "10", "10.", "10.25" — rejects ".", "-", "1.2.3", non-numeric.
 */
export function canParseForBalance(raw) {
  if (raw === '' || raw == null) return true;
  const s = String(raw).trim();
  if (s === '' || s === '.') return s === '';
  if (!/^\d*\.?\d*$/.test(s)) return false;
  return Number.isFinite(Number(s));
}

function parseBalanceValue(raw) {
  if (raw === '' || raw == null) return 0;
  return roundMoney(safeNumber(raw));
}

/**
 * Keep `activeId` as typed (unless clamped); put all remaining on the first other method.
 * Never assigns a negative peer amount.
 */
export function balancePeers(methods, activeId, activeRaw, totalDue) {
  let activeVal = parseBalanceValue(activeRaw);
  if (activeVal < 0) activeVal = 0;

  let displayActive = activeRaw;
  if (activeVal > totalDue) {
    activeVal = totalDue;
    displayActive = totalDue.toFixed(2);
  }

  const rest = roundMoney(totalDue - activeVal);
  const next = {};
  let assignedRest = false;
  methods.forEach((m) => {
    if (m.id === activeId) {
      next[m.id] = displayActive;
      return;
    }
    if (!assignedRest) {
      next[m.id] = rest.toFixed(2);
      assignedRest = true;
    } else {
      next[m.id] = '0.00';
    }
  });
  return next;
}

export default function SplitPaymentDialog({
  open,
  onClose,
  onConfirm,
  grandTotal,
  formatMoney,
  moneyLabel,
  methods: methodsProp,
  pending = false,
}) {
  const methods = useMemo(
    () => (methodsProp?.length ? methodsProp : DEFAULT_METHODS),
    [methodsProp],
  );

  const [amounts, setAmounts] = useState(() => initialAmounts(DEFAULT_METHODS, 0));
  /** Last-edited method — never overwrite its draft while typing. */
  const [activeMethod, setActiveMethod] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setAmounts(initialAmounts(methods, grandTotal));
      setActiveMethod(null);
      setError('');
    }
  }, [open, grandTotal, methods]);

  const totalDue = roundMoney(grandTotal);
  const totalEntered = roundMoney(
    methods.reduce((sum, m) => sum + safeNumber(amounts[m.id]), 0),
  );
  const remaining = roundMoney(totalDue - totalEntered);
  const balanced = Math.abs(remaining) <= BALANCE_TOLERANCE;
  const overpaid = remaining < -BALANCE_TOLERANCE;

  const balanceStatus = balanced
    ? {
      severity: 'success',
      icon: <CheckCircleOutline fontSize="small" />,
      label: 'Balanced — ready to complete',
      amountLabel: 'Remaining',
      amount: 0,
      color: 'teal',
      border: 'var(--mantine-color-teal-3)',
      bg: 'var(--mantine-color-teal-0)',
    }
    : overpaid
      ? {
        severity: 'error',
        icon: <ErrorOutline fontSize="small" />,
        label: 'Overpayment — reduce an amount',
        amountLabel: 'Overpayment',
        amount: Math.abs(remaining),
        color: 'red',
        border: 'var(--mantine-color-red-3)',
        bg: 'var(--mantine-color-red-0)',
      }
      : {
        severity: 'warning',
        icon: <WarningAmber fontSize="small" />,
        label: 'Remaining balance to allocate',
        amountLabel: 'Remaining',
        amount: remaining,
        color: 'yellow',
        border: 'var(--mantine-color-yellow-3)',
        bg: 'var(--mantine-color-yellow-0)',
      };

  const setAmount = (id, raw) => {
    setActiveMethod(id);
    setError('');

    // Always keep the active draft so decimal typing ("10.") is not rewritten.
    if (!canParseForBalance(raw)) {
      setAmounts((prev) => ({ ...prev, [id]: raw }));
      return;
    }

    setAmounts(balancePeers(methods, id, raw, totalDue));
  };

  const normalizeField = (id) => {
    const raw = amounts[id];
    if (!canParseForBalance(raw)) {
      // Incomplete draft on blur → treat as 0 and rebalance peers.
      if (id === activeMethod) {
        setAmounts(balancePeers(methods, id, '0', totalDue));
      }
      return;
    }
    const val = Math.max(0, Math.min(totalDue, parseBalanceValue(raw)));
    setAmounts(balancePeers(methods, id, val.toFixed(2), totalDue));
  };

  const handleConfirm = () => {
    if (!balanced) {
      setError(
        overpaid
          ? `Overpayment of ${formatMoney(Math.abs(remaining))}. Payments must equal ${formatMoney(totalDue)}.`
          : `Remaining ${formatMoney(remaining)}. Payments must equal ${formatMoney(totalDue)}.`,
      );
      return;
    }

    const payments = methods
      .map((m) => ({ method: m.id, amount: safeNumber(amounts[m.id]) }))
      .filter((p) => p.amount > 0);

    // Backward-compatible shape for callers that still expect { cash, card }
    const byMethod = Object.fromEntries(payments.map((p) => [p.method, p.amount]));
    onConfirm({
      payments,
      cash: byMethod.cash ?? 0,
      card: byMethod.card ?? 0,
      ...byMethod,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && balanced && !pending) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <CodexModal
      opened={open}
      onClose={pending ? () => {} : onClose}
      closeOnClickOutside={!pending}
      closeOnEscape={!pending}
      size="sm"
      title={
        <Group gap="xs">
          <CallSplit />
          <span>Split payment</span>
        </Group>
      }
      onKeyDown={handleKeyDown}
    >
      <Stack gap="md">
        {error && <Alert color="red">{error}</Alert>}

        {methods.map((m, idx) => {
          const label = m.label || formatDisplayText(m.id);
          return (
            <CodexInput
              key={m.id}
              autoFocus={idx === 0}
              label={moneyLabel(label)}
              type="text"
              value={amounts[m.id] ?? ''}
              onChange={(e) => setAmount(m.id, e.target.value)}
              onFocus={() => setActiveMethod(m.id)}
              onBlur={() => normalizeField(m.id)}
              disabled={pending}
              inputMode="decimal"
              autoComplete="off"
              aria-label={`${label} amount`}
            />
          );
        })}

        <Box
          role="status"
          aria-live="polite"
          px="md"
          py="sm"
          style={{
            borderRadius: 8,
            border: `1px solid ${balanceStatus.border}`,
            background: balanceStatus.bg,
          }}
        >
          <Stack gap={6}>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Total due</Text>
              <Text size="sm" fw={700}>{formatMoney(totalDue)}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Entered</Text>
              <Text size="sm" fw={700}>{formatMoney(totalEntered)}</Text>
            </Group>
            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed">{balanceStatus.amountLabel}</Text>
              <Text size="sm" fw={800} c={balanceStatus.color}>
                {formatMoney(balanceStatus.amount)}
              </Text>
            </Group>
            <Group gap={6} pt={4}>
              <Box c={balanceStatus.color} style={{ display: 'flex' }} aria-hidden>
                {balanceStatus.icon}
              </Box>
              <Text size="xs" fw={600} c={balanceStatus.color}>
                {balanceStatus.label}
              </Text>
            </Group>
          </Stack>
        </Box>

        <Divider />

        <Group justify="flex-end" gap="sm">
          <CodexButton variant="default" onClick={onClose} disabled={pending} touch>
            Cancel
          </CodexButton>
          <CodexButton
            color="codex"
            disabled={!balanced || pending}
            onClick={handleConfirm}
            touch
          >
            {pending ? 'Processing…' : 'Complete split'}
          </CodexButton>
        </Group>
      </Stack>
    </CodexModal>
  );
}
