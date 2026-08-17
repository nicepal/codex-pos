import { useEffect, useState } from 'react';
import { Stack, Text, Group, Alert, Divider } from '@mantine/core';
import { CardGiftcard } from '@mui/icons-material';
import { CodexModal, CodexButton, CodexInput } from '../../design-system';
import api from '../../services/api';

export default function GiftCardPaymentDialog({
  open,
  onClose,
  onConfirm,
  grandTotal,
  formatMoney,
  pending = false,
}) {
  const [code, setCode] = useState('');
  const [lookup, setLookup] = useState(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (open) {
      setCode('');
      setLookup(null);
      setAmount(grandTotal > 0 ? String(Number(grandTotal).toFixed(2)) : '');
      setError('');
    }
  }, [open, grandTotal]);

  const checkCard = async () => {
    if (!code.trim()) return;
    setChecking(true);
    setError('');
    try {
      const res = await api.get(`/gift-cards/balance/${encodeURIComponent(code.trim())}`);
      const card = res.data?.data;
      setLookup(card);
      const bal = parseFloat(card?.balance) || 0;
      const apply = Math.min(bal, grandTotal);
      setAmount(apply.toFixed(2));
      if (!card?.redeemable) setError('Gift card is not redeemable');
    } catch (err) {
      setLookup(null);
      setError(err.response?.data?.message || 'Gift card not found');
    } finally {
      setChecking(false);
    }
  };

  const applyAmt = parseFloat(amount) || 0;
  const bal = parseFloat(lookup?.balance) || 0;
  const canPay = lookup?.redeemable && applyAmt > 0 && applyAmt <= bal + 0.001 && applyAmt <= grandTotal + 0.001;

  return (
    <CodexModal
      opened={open}
      onClose={pending ? () => {} : onClose}
      closeOnClickOutside={!pending}
      closeOnEscape={!pending}
      size="sm"
      title={
        <Group gap="xs">
          <CardGiftcard style={{ color: 'var(--mantine-color-violet-6)' }} />
          <span>Gift card</span>
        </Group>
      }
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Due {formatMoney(grandTotal)}
        </Text>
        <CodexInput
          autoFocus
          label="Gift card code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === 'Enter') checkCard(); }}
          rightSectionWidth={72}
          rightSection={
            <CodexButton
              size="compact-sm"
              variant="subtle"
              onClick={checkCard}
              disabled={checking || !code.trim()}
            >
              Check
            </CodexButton>
          }
        />
        {lookup && (
          <Alert color={lookup.redeemable ? 'teal' : 'yellow'}>
            Balance {formatMoney(bal)}
            {lookup.expires_at ? ` · expires ${new Date(lookup.expires_at).toLocaleDateString()}` : ''}
          </Alert>
        )}
        {error && <Alert color="red">{error}</Alert>}
        <CodexInput
          type="number"
          label="Amount to apply"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min={0}
          step={0.01}
          max={Math.min(bal || grandTotal, grandTotal)}
          disabled={!lookup?.redeemable}
        />
        {canPay && applyAmt + 0.02 < grandTotal && (
          <Alert color="blue">
            Remaining {formatMoney(grandTotal - applyAmt)} — use Split to combine with cash/card.
          </Alert>
        )}

        <Divider />

        <Group justify="flex-end" gap="sm">
          <CodexButton variant="default" onClick={onClose} disabled={pending} touch>
            Cancel
          </CodexButton>
          <CodexButton
            color="violet"
            disabled={!canPay || pending}
            onClick={() => onConfirm({ code: code.trim(), amount: applyAmt })}
            touch
          >
            {applyAmt + 0.02 >= grandTotal ? 'Pay with gift card' : 'Apply gift card'}
          </CodexButton>
        </Group>
      </Stack>
    </CodexModal>
  );
}
