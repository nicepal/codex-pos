import { useEffect, useState } from 'react';
import { Stack, Text, Group, Badge, Box, Divider } from '@mantine/core';
import { Payments } from '@mui/icons-material';
import { CodexModal, CodexButton, CodexInput } from '../../design-system';
import { cashQuickAmounts } from './posHelpers';

export default function CashPaymentDialog({
  open,
  onClose,
  onConfirm,
  grandTotal,
  formatMoney,
  moneyLabel,
  pending = false,
  tipAmount = 0,
}) {
  const [tendered, setTendered] = useState('');
  const due = (Number(grandTotal) || 0) + (Number(tipAmount) || 0);

  useEffect(() => {
    if (open) setTendered(due > 0 ? String(Number(due).toFixed(2)) : '');
  }, [open, due]);

  const cash = parseFloat(tendered) || 0;
  const change = cash - due;
  const canPay = cash + 0.001 >= due;
  const quick = cashQuickAmounts(due);

  return (
    <CodexModal
      opened={open}
      onClose={pending ? () => {} : onClose}
      closeOnClickOutside={!pending}
      closeOnEscape={!pending}
      size="sm"
      title={
        <Group gap="xs">
          <Payments style={{ color: 'var(--mantine-color-teal-6)' }} />
          <span>Cash payment</span>
        </Group>
      }
    >
      <Stack gap="md">
        <Box ta="center" py="xs">
          <Text size="sm" c="dimmed" tt="uppercase" fw={700} lts={0.6}>
            Total due
          </Text>
          <Text fz={36} fw={800} lh={1.2}>
            {formatMoney(due)}
          </Text>
          {tipAmount > 0 && (
            <Text size="xs" c="dimmed">
              Includes tip {formatMoney(tipAmount)}
            </Text>
          )}
        </Box>

        <Group gap="xs" justify="center">
          {quick.map((amt) => (
            <Badge
              key={amt}
              size="lg"
              variant={Math.abs(cash - amt) < 0.001 ? 'filled' : 'light'}
              color={Math.abs(cash - amt) < 0.001 ? 'teal' : 'gray'}
              style={{ cursor: 'pointer', minHeight: 36, paddingInline: 12 }}
              onClick={() => setTendered(String(amt))}
            >
              {formatMoney(amt)}
            </Badge>
          ))}
        </Group>

        <CodexInput
          autoFocus
          type="number"
          label={moneyLabel('Cash tendered')}
          value={tendered}
          onChange={(e) => setTendered(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canPay && !pending) {
              onConfirm({ tendered: cash, change: Math.max(0, change) });
            }
          }}
          min={0}
          step={0.01}
          styles={{ input: { fontSize: '1.25rem', fontWeight: 700 } }}
        />

        <Box
          px="md"
          py="sm"
          style={{
            borderRadius: 8,
            border: `1px solid ${change >= 0 ? 'var(--mantine-color-teal-3)' : 'var(--mantine-color-red-3)'}`,
            background: change >= 0 ? 'var(--mantine-color-teal-0)' : 'var(--mantine-color-red-0)',
          }}
        >
          <Group justify="space-between" align="center">
            <Text fw={700} tt="uppercase" size="sm" lts={0.5}>
              Change
            </Text>
            <Text fz={24} fw={800} c={change >= 0 ? 'teal' : 'red'}>
              {formatMoney(Math.max(0, change))}
            </Text>
          </Group>
        </Box>

        <Divider />

        <Group justify="flex-end" gap="sm">
          <CodexButton variant="default" onClick={onClose} disabled={pending} touch>
            Cancel
          </CodexButton>
          <CodexButton
            color="teal"
            disabled={!canPay || pending}
            onClick={() => onConfirm({ tendered: cash, change: Math.max(0, change) })}
            touch
            style={{ minWidth: 140 }}
          >
            {pending ? 'Processing…' : 'Complete cash'}
          </CodexButton>
        </Group>
      </Stack>
    </CodexModal>
  );
}
