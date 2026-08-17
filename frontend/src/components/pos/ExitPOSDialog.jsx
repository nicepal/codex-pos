import { Stack, Text, Group, Divider } from '@mantine/core';
import { ExitToApp, Pause, DeleteOutline } from '@mui/icons-material';
import { CodexModal, CodexButton } from '../../design-system';

export default function ExitPOSDialog({
  open,
  onClose,
  onContinue,
  onHoldAndExit,
  onDiscardAndExit,
  hasItems,
  canHold,
  holdPending = false,
}) {
  if (!hasItems) {
    return (
      <CodexModal opened={open} onClose={onClose} size="sm" title="Exit POS?">
        <Stack gap="md">
          <Text c="dimmed">Return to the business dashboard?</Text>
          <Divider />
          <Group justify="flex-end" gap="sm">
            <CodexButton variant="default" onClick={onClose} touch>
              Stay
            </CodexButton>
            <CodexButton
              color="codex"
              leftSection={<ExitToApp fontSize="small" />}
              onClick={onContinue}
              touch
            >
              Exit POS
            </CodexButton>
          </Group>
        </Stack>
      </CodexModal>
    );
  }

  return (
    <CodexModal opened={open} onClose={onClose} size="sm" title="Cart has items">
      <Stack gap="md">
        <Text c="dimmed">
          What would you like to do before leaving the register?
        </Text>
        <Stack gap="sm">
          <CodexButton fullWidth variant="outline" onClick={onClose} touch>
            Continue selling
          </CodexButton>
          {canHold && (
            <CodexButton
              fullWidth
              color="violet"
              leftSection={<Pause fontSize="small" />}
              disabled={holdPending}
              onClick={onHoldAndExit}
              touch
            >
              {holdPending ? 'Holding…' : 'Hold & exit'}
            </CodexButton>
          )}
          <CodexButton
            fullWidth
            color="red"
            leftSection={<DeleteOutline fontSize="small" />}
            onClick={onDiscardAndExit}
            touch
          >
            Discard & exit
          </CodexButton>
        </Stack>
      </Stack>
    </CodexModal>
  );
}
