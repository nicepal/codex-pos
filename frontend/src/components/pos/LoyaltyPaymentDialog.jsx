import { useEffect, useState } from 'react';
import { Stack, Text, Group, Alert, Divider } from '@mantine/core';
import { Stars } from '@mui/icons-material';
import { CodexModal, CodexButton, CodexInput } from '../../design-system';

/** Default: 1 point = $0.01 (matches backend loyalty redeem_rate default). */
const DEFAULT_REDEEM_RATE = 0.01;

export default function LoyaltyPaymentDialog({
  open,
  onClose,
  onConfirm,
  grandTotal,
  formatMoney,
  customer,
  redeemRate = DEFAULT_REDEEM_RATE,
  pending = false,
}) {
  const points = parseInt(customer?.loyalty_points, 10) || 0;
  const rate = redeemRate > 0 ? redeemRate : DEFAULT_REDEEM_RATE;
  const maxValue = Math.min(points * rate, grandTotal);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (open) setAmount(maxValue > 0 ? maxValue.toFixed(2) : '0.00');
  }, [open, maxValue]);

  const applyAmt = parseFloat(amount) || 0;
  const pointsNeeded = Math.ceil(applyAmt / rate);
  const canPay = customer?.id && applyAmt > 0 && pointsNeeded <= points && applyAmt <= grandTotal + 0.001;

  if (!customer?.id) {
    return (
      <CodexModal opened={open} onClose={onClose} size="sm" title="Loyalty">
        <Stack gap="md">
          <Alert color="blue">Select a customer with loyalty points first.</Alert>
          <Group justify="flex-end">
            <CodexButton variant="default" onClick={onClose} touch>
              Close
            </CodexButton>
          </Group>
        </Stack>
      </CodexModal>
    );
  }

  return (
    <CodexModal
      opened={open}
      onClose={pending ? () => {} : onClose}
      closeOnClickOutside={!pending}
      closeOnEscape={!pending}
      size="sm"
      title={
        <Group gap="xs">
          <Stars style={{ color: 'var(--mantine-color-yellow-6)' }} />
          <span>Loyalty points</span>
        </Group>
      }
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {customer.name || customer.email} · {points} pts available
          ({formatMoney(points * rate)} value) · due {formatMoney(grandTotal)}
        </Text>
        <CodexInput
          autoFocus
          type="number"
          label="Amount to redeem"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min={0}
          step={0.01}
          max={maxValue}
        />
        <Alert color="blue">
          Uses ~{pointsNeeded} points at {formatMoney(rate)}/pt
        </Alert>
        {canPay && applyAmt + 0.02 < grandTotal && (
          <Alert color="yellow">
            Remaining {formatMoney(grandTotal - applyAmt)} — use Split for the rest.
          </Alert>
        )}

        <Divider />

        <Group justify="flex-end" gap="sm">
          <CodexButton variant="default" onClick={onClose} disabled={pending} touch>
            Cancel
          </CodexButton>
          <CodexButton
            color="yellow"
            disabled={!canPay || pending}
            onClick={() => onConfirm({ amount: applyAmt, points: pointsNeeded })}
            touch
          >
            Redeem points
          </CodexButton>
        </Group>
      </Stack>
    </CodexModal>
  );
}
