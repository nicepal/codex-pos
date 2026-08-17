import { Stack, Alert, Group, Divider } from '@mantine/core';
import { CodexModal, CodexButton, CodexInput, CodexSelect } from '../../design-system';
import { employeeLabel } from './posHelpers';

export default function ManagerOverrideDialog({
  open,
  onClose,
  onApprove,
  employees = [],
  employeeId,
  pin,
  onEmployeeChange,
  onPinChange,
  message = 'Discount exceeds 20%. Select a manager and enter PIN.',
  pending = false,
}) {
  const employeeOptions = (employees || []).map((e) => ({
    value: String(e.id),
    label: employeeLabel(e),
  }));

  return (
    <CodexModal
      opened={open}
      onClose={pending ? () => {} : onClose}
      closeOnClickOutside={!pending}
      closeOnEscape={!pending}
      size="sm"
      title="Manager approval"
    >
      <Stack gap="md">
        <Alert color="blue">{message}</Alert>
        <CodexSelect
          label="Manager"
          data={employeeOptions}
          value={employeeId ? String(employeeId) : null}
          onChange={(v) => onEmployeeChange(v || '')}
          placeholder="Select manager"
          searchable
        />
        <CodexInput
          type="password"
          label="Manager PIN"
          value={pin || ''}
          onChange={(e) => onPinChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && employeeId && (pin || '').length >= 4 && !pending) {
              onApprove();
            }
          }}
          autoComplete="off"
        />

        <Divider />

        <Group justify="flex-end" gap="sm">
          <CodexButton variant="default" onClick={onClose} disabled={pending} touch>
            Cancel
          </CodexButton>
          <CodexButton
            color="codex"
            disabled={pending || !employeeId || (pin || '').length < 4}
            onClick={onApprove}
            touch
          >
            {pending ? 'Checking…' : 'Approve'}
          </CodexButton>
        </Group>
      </Stack>
    </CodexModal>
  );
}
