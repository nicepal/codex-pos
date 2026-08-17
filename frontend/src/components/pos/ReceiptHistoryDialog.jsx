import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Stack, Text, Group, Badge, Box, Divider, Center, Loader, ActionIcon, ScrollArea,
} from '@mantine/core';
import { Print, ReceiptLong, Refresh } from '@mui/icons-material';
import { CodexModal, CodexButton, CodexInput } from '../../design-system';
import api from '../../services/api';
import { friendlyPosError } from './posErrors';

function printHtml(html) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}

export default function ReceiptHistoryDialog({
  open,
  onClose,
  formatMoney,
  onSelectOrder,
  branchId,
}) {
  const [q, setQ] = useState('');
  const [printingId, setPrintingId] = useState(null);
  const [error, setError] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['pos-receipt-history', q, branchId],
    queryFn: () => api.get('/orders', {
      params: {
        limit: 30,
        search: q.trim() || undefined,
        branch_id: branchId || undefined,
        status: undefined,
      },
    }).then((r) => r.data.data),
    enabled: open,
  });

  const orders = (data || []).filter((o) => ['paid', 'completed', 'refunded'].includes(o.status));

  const reprint = async (orderId) => {
    setPrintingId(orderId);
    setError('');
    try {
      const res = await api.post('/print/receipts', { order_id: orderId, width: '80' });
      const payload = res.data?.data;
      const html = payload?.html || payload?.payload?.html;
      if (html) printHtml(html);
      else setError('Print job created but no HTML returned — check print station.');
    } catch (err) {
      setError(friendlyPosError(err, 'Reprint failed'));
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <CodexModal
      opened={open}
      onClose={onClose}
      size="md"
      title={
        <Group gap="xs" justify="space-between" style={{ width: '100%' }}>
          <Group gap="xs">
            <ReceiptLong />
            <span>Receipt history</span>
          </Group>
          <ActionIcon
            variant="subtle"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh"
          >
            <Refresh fontSize="small" />
          </ActionIcon>
        </Group>
      }
    >
      <Stack gap="md">
        <CodexInput
          placeholder="Search order #…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {error && <Text c="red" size="sm">{error}</Text>}
        {isLoading ? (
          <Center py="xl"><Loader size="sm" /></Center>
        ) : orders.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            No recent receipts
          </Text>
        ) : (
          <ScrollArea.Autosize mah={420}>
            <Stack gap={4}>
              {orders.map((o) => (
                <Group
                  key={o.id}
                  justify="space-between"
                  wrap="nowrap"
                  px="xs"
                  py="sm"
                  style={{
                    minHeight: 56,
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: '1px solid var(--mantine-color-gray-2)',
                  }}
                  onClick={() => onSelectOrder?.(o.id)}
                >
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <Group gap="xs">
                      <Text fw={600}>{o.order_number}</Text>
                      <Badge size="sm">{o.status}</Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {new Date(o.created_at).toLocaleString()} · {formatMoney(o.total_amount)} · {o.payment_method || '—'}
                    </Text>
                  </Box>
                  <ActionIcon
                    variant="subtle"
                    aria-label="Reprint"
                    disabled={printingId === o.id}
                    onClick={(e) => { e.stopPropagation(); reprint(o.id); }}
                  >
                    {printingId === o.id ? <Loader size={18} /> : <Print fontSize="small" />}
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        )}

        <Divider />

        <Group justify="flex-end">
          <CodexButton variant="default" onClick={onClose} touch>
            Close
          </CodexButton>
        </Group>
      </Stack>
    </CodexModal>
  );
}
