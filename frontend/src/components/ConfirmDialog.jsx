import { Text, Button, Group } from '@mantine/core';
import { CodexModal } from '../design-system';

export default function ConfirmDialog({
  open,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  danger = false,
}) {
  return (
    <CodexModal opened={!!open} onClose={onCancel} title={title} size="sm">
      <Text c="dimmed" size="sm" mb="lg">
        {message}
      </Text>
      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          color={danger ? 'red' : 'codex'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </Group>
    </CodexModal>
  );
}
