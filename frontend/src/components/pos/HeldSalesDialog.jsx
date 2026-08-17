import { Stack, Text, Group, Box, Divider, ScrollArea } from '@mantine/core';
import { PlayArrow, PauseCircleOutline } from '@mui/icons-material';
import { CodexModal, CodexButton } from '../../design-system';

export default function HeldSalesDialog({
  open,
  onClose,
  heldOrders = [],
  formatMoney,
  onResume,
  resumePending = false,
}) {
  return (
    <CodexModal
      opened={open}
      onClose={onClose}
      size="md"
      title={
        <Group gap="xs">
          <PauseCircleOutline />
          <span>Held sales</span>
        </Group>
      }
    >
      <Stack gap="md">
        {!heldOrders?.length ? (
          <Box py="xl" ta="center">
            <Text c="dimmed">
              No held sales. Park a cart with Hold (F6) to resume later.
            </Text>
          </Box>
        ) : (
          <ScrollArea.Autosize mah={360}>
            <Stack gap="xs">
              {heldOrders.map((order) => (
                <Group
                  key={order.id}
                  justify="space-between"
                  wrap="nowrap"
                  py="sm"
                  px="xs"
                  style={{
                    borderBottom: '1px solid var(--mantine-color-gray-2)',
                  }}
                >
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <Text fw={600} truncate>
                      {order.order_number || `Order ${order.id}`}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {order.item_count || 0} items · {new Date(order.created_at).toLocaleString()}
                    </Text>
                  </Box>
                  <Text fw={700} mr="sm">
                    {formatMoney(order.total_amount)}
                  </Text>
                  <CodexButton
                    color="codex"
                    leftSection={<PlayArrow fontSize="small" />}
                    disabled={resumePending}
                    onClick={() => onResume(order.id)}
                    touch
                  >
                    Resume
                  </CodexButton>
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
