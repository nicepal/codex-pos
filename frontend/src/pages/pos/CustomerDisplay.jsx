import { useEffect, useState } from 'react';
import { Box, Text, Divider, Stack, Group } from '@mantine/core';
import { getSocket } from '../../services/realtime';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import { CODEX_TOKENS } from '../../design-system/theme/codexTheme';

/**
 * Customer-facing display — open on a second screen (same logged-in session).
 * Listens for live cart updates from the register via Socket.IO.
 */
export default function CustomerDisplay() {
  const { formatMoney } = useBusinessCurrency();
  const [snapshot, setSnapshot] = useState({
    items: [],
    subtotal: 0,
    discount: 0,
    taxAmount: 0,
    grandTotal: 0,
    customer: null,
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const onDisplay = (payload) => {
      setSnapshot((prev) => ({ ...prev, ...payload }));
    };
    socket.on('pos.display', onDisplay);
    return () => socket.off('pos.display', onDisplay);
  }, []);

  const { items, subtotal, discount, taxAmount, grandTotal, customer } = snapshot;
  const visible = (items || []).filter((i) => !i.voided);

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: CODEX_TOKENS.bgDark,
        color: '#f8fafc',
        padding: 'clamp(24px, 4vw, 48px)',
        fontFamily: CODEX_TOKENS.fontFamily,
      }}
    >
      <Text fz={{ base: 32, sm: 40 }} fw={800} mb="md" lh={1.1}>
        Your order
      </Text>
      {customer && (
        <Text c="#94a3b8" fz="lg" mb="lg">Customer: {customer}</Text>
      )}

      <Stack gap="md" mb="xl">
        {visible.map((item, idx) => (
          <Group key={idx} justify="space-between" align="baseline" wrap="nowrap">
            <Text fz={{ base: 22, sm: 28 }} fw={600} style={{ minWidth: 0 }}>
              {item.product_name} × {item.quantity}
            </Text>
            <Text fz={{ base: 20, sm: 24 }} c="#94a3b8" style={{ whiteSpace: 'nowrap' }}>
              {formatMoney((item.unit_price || 0) * item.quantity)}
            </Text>
          </Group>
        ))}
        {!visible.length && (
          <Text c="#64748b" fz="xl" ta="center" py="xl">
            Waiting for items…
          </Text>
        )}
      </Stack>

      <Divider color="#334155" mb="lg" />

      <Stack gap="sm">
        <Group justify="space-between">
          <Text fz="xl">Subtotal</Text>
          <Text fz="xl">{formatMoney(subtotal || 0)}</Text>
        </Group>
        {discount > 0 && (
          <Group justify="space-between">
            <Text fz="xl">Discount</Text>
            <Text fz="xl">−{formatMoney(discount)}</Text>
          </Group>
        )}
        <Group justify="space-between">
          <Text fz="xl">Tax</Text>
          <Text fz="xl">{formatMoney(taxAmount || 0)}</Text>
        </Group>
        <Group justify="space-between" mt="md">
          <Text fz={{ base: 28, sm: 36 }} fw={800}>Total</Text>
          <Text fz={{ base: 28, sm: 36 }} fw={800}>{formatMoney(grandTotal || 0)}</Text>
        </Group>
      </Stack>
    </Box>
  );
}
