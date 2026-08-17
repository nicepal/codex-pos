import { Stack, Text, Group, Box, Alert, Divider } from '@mantine/core';
import { CreditCard } from '@mui/icons-material';
import { CodexModal, CodexButton } from '../../design-system';

export default function CardPaymentDialog({
  open,
  onClose,
  onConfirm,
  grandTotal,
  formatMoney,
  pending = false,
}) {
  return (
    <CodexModal
      opened={open}
      onClose={pending ? () => {} : onClose}
      closeOnClickOutside={!pending}
      closeOnEscape={!pending}
      size="sm"
      title={
        <Group gap="xs">
          <CreditCard style={{ color: 'var(--mantine-color-codex-6)' }} />
          <span>Card payment</span>
        </Group>
      }
    >
      <Stack gap="md">
        <Box ta="center" py="xs">
          <Text size="sm" c="dimmed" tt="uppercase" fw={700} lts={0.6}>
            Charge amount
          </Text>
          <Text fz={36} fw={800} lh={1.2}>
            {formatMoney(grandTotal)}
          </Text>
        </Box>

        <Alert color="blue" variant="light" title="Record only">
          CodexPOS does not capture card payments from a payment terminal in this build.
          Confirm the charge on your external terminal or gateway, then complete the sale.
        </Alert>

        <Divider />

        <Group justify="flex-end" gap="sm">
          <CodexButton variant="default" onClick={onClose} disabled={pending} touch>
            Cancel
          </CodexButton>
          <CodexButton
            color="codex"
            disabled={pending}
            onClick={onConfirm}
            touch
            style={{ minWidth: 140 }}
          >
            {pending ? 'Processing…' : 'Complete card'}
          </CodexButton>
        </Group>
      </Stack>
    </CodexModal>
  );
}
