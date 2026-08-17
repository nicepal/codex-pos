import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Text, Group, Box, Divider, Alert, SegmentedControl, ScrollArea,
} from '@mantine/core';
import { AccountBalanceWallet } from '@mui/icons-material';
import { CodexModal, CodexButton, CodexInput } from '../../design-system';
import api from '../../services/api';
import { friendlyPosError } from './posErrors';

export default function CashManagementDialog({
  open,
  onClose,
  sessionId,
  formatMoney,
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState('cash_in');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['drawer-summary', sessionId],
    queryFn: () => api.get(`/drawer/${sessionId}/summary`).then((r) => r.data.data),
    enabled: open && !!sessionId,
  });

  const mutation = useMutation({
    mutationFn: (payload) => api.post(`/drawer/${sessionId}/movements`, payload),
    onSuccess: () => {
      setAmount('');
      setNote('');
      setError('');
      refetch();
      queryClient.invalidateQueries(['drawer-open']);
    },
    onError: (err) => setError(friendlyPosError(err, 'Could not record movement')),
  });

  const submit = () => {
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError('Enter a positive amount');
      return;
    }
    mutation.mutate({ movement_type: type, amount: n, note: note || undefined });
  };

  return (
    <CodexModal
      opened={open}
      onClose={onClose}
      size="md"
      title={
        <Group gap="xs">
          <AccountBalanceWallet />
          <span>Cash management</span>
        </Group>
      }
    >
      {isLoading || !data ? (
        <Text c="dimmed" ta="center" py="xl">Loading…</Text>
      ) : (
        <Stack gap="md">
          <Box p="md" style={{ borderRadius: 8, background: 'var(--mantine-color-gray-0)' }}>
            <Text size="xs" c="dimmed">Expected in drawer</Text>
            <Text fz={32} fw={800}>{formatMoney(data.expected_cash)}</Text>
            <Divider my="sm" />
            <Stack gap={4}>
              <Row label="Opening float" value={formatMoney(data.opening_float)} />
              <Row label="+ Cash sales" value={formatMoney(data.cash_sales)} />
              <Row label="+ Cash in" value={formatMoney(data.cash_in)} />
              <Row label="− Cash refunds" value={formatMoney(data.cash_refunds)} />
              <Row label="− Cash out" value={formatMoney(data.cash_out)} />
            </Stack>
          </Box>

          {error && (
            <Alert color="red" withCloseButton onClose={() => setError('')}>{error}</Alert>
          )}

          <SegmentedControl
            fullWidth
            value={type}
            onChange={setType}
            data={[
              { label: 'Cash in', value: 'cash_in' },
              { label: 'Cash out', value: 'cash_out' },
            ]}
          />
          <CodexInput
            type="number"
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0.01}
            step={0.01}
          />
          <CodexInput
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={type === 'cash_in' ? 'e.g. Safe drop reverse' : 'e.g. Safe drop / paid out'}
          />
          <CodexButton
            color="codex"
            disabled={mutation.isPending}
            onClick={submit}
            touch
          >
            {mutation.isPending ? 'Saving…' : `Record ${type === 'cash_in' ? 'cash in' : 'cash out'}`}
          </CodexButton>

          {(data.movements || []).length > 0 && (
            <>
              <Text fw={700} size="sm" pt="xs">Recent movements</Text>
              <ScrollArea.Autosize mah={180}>
                <Stack gap="xs">
                  {data.movements.map((m) => (
                    <Box
                      key={m.id}
                      py="xs"
                      px="sm"
                      style={{
                        borderRadius: 6,
                        border: '1px solid var(--mantine-color-gray-2)',
                      }}
                    >
                      <Text size="sm" fw={600}>
                        {m.movement_type === 'cash_in' ? '+' : '−'} {formatMoney(m.amount)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {new Date(m.created_at).toLocaleString()}
                        {m.note ? ` · ${m.note}` : ''}
                      </Text>
                    </Box>
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            </>
          )}

          <Divider />

          <Group justify="flex-end">
            <CodexButton variant="default" onClick={onClose} touch>
              Close
            </CodexButton>
          </Group>
        </Stack>
      )}
    </CodexModal>
  );
}

function Row({ label, value }) {
  return (
    <Group justify="space-between">
      <Text size="sm" c="dimmed">{label}</Text>
      <Text size="sm" fw={600}>{value}</Text>
    </Group>
  );
}
