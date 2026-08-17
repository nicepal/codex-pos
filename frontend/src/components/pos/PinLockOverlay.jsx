import { Box, Stack, Text, Alert, Paper } from '@mantine/core';
import { Lock } from '@mui/icons-material';
import { CodexButton, CodexInput, CodexSelect } from '../../design-system';
import { employeeLabel } from './posHelpers';

export default function PinLockOverlay({
  employees = [],
  pinEmployeeId,
  pinValue,
  pinError,
  pinBusy,
  onEmployeeChange,
  onPinChange,
  onUnlock,
}) {
  const employeeOptions = (employees || []).map((e) => ({
    value: String(e.id),
    label: employeeLabel(e),
  }));

  return (
    <Box
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(15,23,42,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <Paper
        withBorder
        shadow="md"
        p="xl"
        radius="md"
        style={{ width: '100%', maxWidth: 400 }}
      >
        <Stack gap="md" align="center">
          <Lock style={{ fontSize: 40, color: 'var(--mantine-color-codex-6)' }} />
          <Text fw={700} size="lg">Register locked</Text>
          <Text size="sm" c="dimmed" ta="center">
            Enter employee PIN to unlock this register.
          </Text>
          {pinError && <Alert color="red" w="100%">{pinError}</Alert>}
          <CodexSelect
            w="100%"
            label="Employee"
            data={employeeOptions}
            value={pinEmployeeId ? String(pinEmployeeId) : null}
            onChange={(v) => onEmployeeChange(v || '')}
            placeholder="Select employee"
            searchable
          />
          <CodexInput
            w="100%"
            type="password"
            label="PIN"
            value={pinValue}
            onChange={(e) => onPinChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onUnlock(); }}
          />
          <CodexButton
            fullWidth
            color="codex"
            disabled={pinBusy}
            onClick={onUnlock}
            touch
            style={{ minHeight: 52 }}
          >
            {pinBusy ? 'Unlocking…' : 'Unlock'}
          </CodexButton>
        </Stack>
      </Paper>
    </Box>
  );
}
