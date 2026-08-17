import { Stack, Text, Group, Divider, ScrollArea, Box } from '@mantine/core';
import { CodexModal, CodexButton } from '../../design-system';

export default function SendToKitchenDialog({ open, onClose, onConfirm, items, formatMoney, pending }) {
  const activeItems = (items || []).filter((i) => !i.voided && (!i.kitchen_status || i.kitchen_status === 'not_sent'));

  return (
    <CodexModal opened={open} onClose={onClose} size="md" title="Send to kitchen">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {activeItems.length} item(s) will be sent to the kitchen display:
        </Text>
        <ScrollArea.Autosize mah={280}>
          <Stack gap={4}>
            {activeItems.map((item, idx) => (
              <Box
                key={`${item.product_id}-${idx}`}
                py="xs"
                style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
              >
                <Text size="sm" fw={600}>
                  {item.quantity}× {item.product_name}
                </Text>
                <Text size="xs" c="dimmed">
                  {item.item_notes ? `Note: ${item.item_notes}` : formatMoney(item.unit_price)}
                </Text>
              </Box>
            ))}
          </Stack>
        </ScrollArea.Autosize>

        <Divider />

        <Group justify="flex-end" gap="sm">
          <CodexButton variant="default" onClick={onClose} touch>
            Cancel
          </CodexButton>
          <CodexButton
            color="codex"
            onClick={onConfirm}
            disabled={!activeItems.length || pending}
            touch
          >
            {pending ? 'Sending…' : 'Send to kitchen'}
          </CodexButton>
        </Group>
      </Stack>
    </CodexModal>
  );
}
