import { useEffect, useState } from 'react';
import { Box, Stack, Text, Alert, Group, Loader } from '@mantine/core';
import { PointOfSale, Login } from '@mui/icons-material';
import { CodexModal, CodexButton, CodexInput, CodexSelect } from '../../design-system';
import { employeeLabel } from './posHelpers';

/**
 * Blocks selling until an open shift + open cash drawer exist (staff_pro).
 */
export default function RegisterGate({
  open,
  employees = [],
  branches = [],
  employeeId,
  branchId,
  openingFloat,
  onEmployeeChange,
  onBranchChange,
  onOpeningFloatChange,
  onOpenRegister,
  pending = false,
  error = '',
  formatMoney,
}) {
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (open) setLocalError('');
  }, [open]);

  if (!open) return null;

  const canOpen = Boolean(employeeId) && !pending;

  const employeeOptions = (employees || []).map((e) => ({
    value: String(e.id),
    label: employeeLabel(e),
  }));
  const branchOptions = [
    { value: '', label: 'Default branch' },
    ...(branches || []).map((b) => ({ value: String(b.id), label: b.name })),
  ];

  return (
    <Box
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <CodexModal
        opened
        onClose={() => {}}
        closeOnClickOutside={false}
        closeOnEscape={false}
        withCloseButton={false}
        size="md"
        overlayProps={{ backgroundOpacity: 0 }}
        title={
          <Group gap="xs">
            <PointOfSale style={{ color: 'var(--mantine-color-codex-6)' }} />
            <span>Open register</span>
          </Group>
        }
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Clock in and open the cash drawer before ringing up sales. Opening float is cash already in the till.
          </Text>
          {(error || localError) && (
            <Alert color="red">{error || localError}</Alert>
          )}
          <CodexSelect
            label="Cashier"
            data={employeeOptions}
            value={employeeId ? String(employeeId) : null}
            onChange={(v) => onEmployeeChange(v || '')}
            placeholder="Select cashier"
            required
            searchable
          />
          <CodexSelect
            label="Branch"
            data={branchOptions}
            value={branchId != null && branchId !== '' ? String(branchId) : ''}
            onChange={(v) => onBranchChange(v ?? '')}
            placeholder="Default branch"
          />
          <CodexInput
            type="number"
            label="Opening float"
            value={openingFloat}
            onChange={(e) => onOpeningFloatChange(e.target.value)}
            min={0}
            step={0.01}
            description={formatMoney
              ? `Counted cash in drawer (${formatMoney(parseFloat(openingFloat) || 0)})`
              : 'Counted cash in drawer at start'}
          />
          <CodexButton
            fullWidth
            color="codex"
            size="lg"
            leftSection={pending ? <Loader size={18} color="white" /> : <Login fontSize="small" />}
            disabled={!canOpen}
            onClick={() => {
              if (!employeeId) {
                setLocalError('Select a cashier to clock in');
                return;
              }
              onOpenRegister();
            }}
            touch
            style={{ minHeight: 52 }}
          >
            {pending ? 'Opening…' : 'Open register'}
          </CodexButton>
        </Stack>
      </CodexModal>
    </Box>
  );
}
