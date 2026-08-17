import { Box, Divider, Group, Stack, Text, Title } from '@mantine/core';
import { CodexInput } from '../../design-system';

export default function PaymentSummary({
  subtotal,
  discount,
  taxRate,
  taxAmount,
  tipAmount = 0,
  grandTotal,
  currency,
  formatMoney,
  onDiscountChange,
  onTipChange,
  showTip = false,
  couponCode,
  onCouponChange,
  showCoupon = false,
}) {
  return (
    <Box px={4}>
      {showCoupon && (
        <CodexInput
          mb="sm"
          placeholder="Coupon code"
          value={couponCode || ''}
          onChange={(e) => onCouponChange?.(e.target.value.toUpperCase())}
        />
      )}
      <CodexInput
        mb="sm"
        type="number"
        label={`Order discount (${currency})`}
        value={discount || ''}
        onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
        min={0}
        step={0.01}
      />
      {showTip && (
        <CodexInput
          mb="sm"
          type="number"
          label={`Tip (${currency})`}
          value={tipAmount || ''}
          onChange={(e) => onTipChange?.(parseFloat(e.target.value) || 0)}
          min={0}
          step={0.01}
        />
      )}
      <Stack gap={4} mb="xs">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Subtotal</Text>
          <Text size="sm">{formatMoney(subtotal)}</Text>
        </Group>
        {discount > 0 && (
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Discount</Text>
            <Text size="sm" c="red">−{formatMoney(discount)}</Text>
          </Group>
        )}
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Tax ({taxRate}%)</Text>
          <Text size="sm">{formatMoney(taxAmount)}</Text>
        </Group>
        {tipAmount > 0 && (
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Tip</Text>
            <Text size="sm">{formatMoney(tipAmount)}</Text>
          </Group>
        )}
        <Divider my={4} />
        <Group justify="space-between" align="baseline">
          <Text fw={700}>Total</Text>
          <Title order={3} c="codex" style={{ margin: 0 }}>
            {formatMoney(grandTotal)}
          </Title>
        </Group>
      </Stack>
    </Box>
  );
}
