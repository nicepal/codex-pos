import { useEffect, useMemo, useState } from 'react';
import { Box, Group, Stack, Text, Badge, Button } from '@mantine/core';
import { AccessTime, PriorityHigh } from '@mui/icons-material';

const STATUS_LABELS = {
  pending: 'NEW',
  accepted: 'ACCEPTED',
  preparing: 'PREPARING',
  ready: 'READY',
  served: 'SERVED',
  completed: 'SERVED',
};

function formatElapsed(createdAt) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function KDSTicketCard({
  ticket,
  warningMinutes = 8,
  overdueMinutes = 15,
  isNew,
  onAccept,
  onStart,
  onReady,
  onComplete,
  onRecall,
  busy,
}) {
  const [elapsed, setElapsed] = useState(formatElapsed(ticket.created_at));
  const mins = useMemo(() => {
    const ms = Date.now() - new Date(ticket.created_at).getTime();
    return Math.floor(ms / 60000);
  }, [elapsed, ticket.created_at]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(formatElapsed(ticket.created_at)), 1000);
    return () => clearInterval(t);
  }, [ticket.created_at]);

  const timerColor = mins >= overdueMinutes ? '#f85149' : mins >= warningMinutes ? '#d29922' : '#58a6ff';
  const tableLabel = ticket.table_name ? `Table ${ticket.table_name}` : 'Takeaway';
  const items = (ticket.items || []).filter((i) => i.status !== 'cancelled');

  return (
    <Box
      p="md"
      mb="md"
      style={{
        background: '#161b22',
        border: `1px solid ${isNew ? '#58a6ff' : '#30363d'}`,
        borderRadius: 10,
        animation: isNew ? 'kdsPulse 1.2s ease-out 2' : 'none',
      }}
    >
      <style>{`
        @keyframes kdsPulse {
          0% { box-shadow: 0 0 0 0 rgba(88,166,255,0.5); }
          100% { box-shadow: 0 0 0 12px rgba(88,166,255,0); }
        }
      `}</style>
      <Group justify="space-between" align="flex-start" mb="sm">
        <Box>
          <Text fz={22} fw={800} lts={1}>
            {ticket.ticket_number}
          </Text>
          <Text size="sm" c="#8b949e">
            {tableLabel}
            {ticket.guest_count ? ` · ${ticket.guest_count} guests` : ''}
          </Text>
        </Box>
        <Stack align="flex-end" gap={4}>
          <Badge
            leftSection={<AccessTime style={{ fontSize: 14, color: timerColor }} />}
            style={{ background: '#21262d', color: timerColor, fontWeight: 700, fontSize: '0.95rem' }}
          >
            {elapsed}
          </Badge>
          {ticket.priority > 0 && (
            <Badge color="red" leftSection={<PriorityHigh style={{ fontSize: 14 }} />}>
              Rush
            </Badge>
          )}
        </Stack>
      </Group>

      <Stack gap="xs" mb="md">
        {items.map((item) => (
          <Box key={item.id}>
            <Text fw={600}>
              {item.quantity}× {item.product_name}
            </Text>
            {item.modifiers?.length > 0 && (
              <Text size="xs" c="#8b949e">
                {item.modifiers.map((m) => m.option_name || m.name).join(', ')}
              </Text>
            )}
            {item.notes && (
              <Text size="xs" c="#d29922">
                Note: {item.notes}
              </Text>
            )}
          </Box>
        ))}
      </Stack>

      <Group gap="xs" wrap="wrap">
        {ticket.status === 'pending' && (
          <>
            <Button color="cyan" disabled={busy} onClick={() => onAccept(ticket.id)}>
              Accept
            </Button>
            <Button variant="outline" color="gray" disabled={busy} onClick={() => onStart(ticket.id)}>
              Start prep
            </Button>
          </>
        )}
        {ticket.status === 'accepted' && (
          <Button color="violet" disabled={busy} onClick={() => onStart(ticket.id)}>
            Start prep
          </Button>
        )}
        {ticket.status === 'preparing' && (
          <Button color="yellow" disabled={busy} onClick={() => onReady(ticket.id)}>
            Ready
          </Button>
        )}
        {(ticket.status === 'ready') && (
          <Button color="teal" disabled={busy} onClick={() => onComplete(ticket.id)}>
            Mark served
          </Button>
        )}
        {(ticket.status === 'served' || ticket.status === 'completed') && (
          <Button variant="outline" size="xs" color="gray" disabled={busy} onClick={() => onRecall(ticket.id)}>
            Recall
          </Button>
        )}
        <Badge variant="outline" color="gray">
          {STATUS_LABELS[ticket.status] || ticket.status}
        </Badge>
      </Group>
    </Box>
  );
}
