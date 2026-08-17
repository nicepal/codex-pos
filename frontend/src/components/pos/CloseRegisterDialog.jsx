import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, Text, Group, Box, Divider, Alert, Loader, Center } from '@mantine/core';
import { Assessment, LockClock } from '@mui/icons-material';
import { CodexModal, CodexButton, CodexInput } from '../../design-system';
import api from '../../services/api';
import { friendlyPosError } from './posErrors';

/**
 * X report (mid-shift) or close register (Z + drawer close + optional clock-out).
 */
export default function CloseRegisterDialog({
  open,
  onClose,
  mode = 'close', // 'x' | 'close'
  shiftId,
  drawerSessionId,
  formatMoney,
  onClosed,
}) {
  const queryClient = useQueryClient();
  const [counted, setCounted] = useState('');
  const [error, setError] = useState('');
  const isClose = mode === 'close';

  const reportPath = isClose
    ? (shiftId ? `/shifts/${shiftId}/z-report` : null)
    : (shiftId ? `/shifts/${shiftId}/x-report` : null);

  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ['shift-report', shiftId, mode],
    queryFn: () => api.get(reportPath).then((r) => r.data.data),
    enabled: open && !!reportPath,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['drawer-summary', drawerSessionId, 'close'],
    queryFn: () => api.get(`/drawer/${drawerSessionId}/summary`).then((r) => r.data.data),
    enabled: open && isClose && !!drawerSessionId,
  });

  useEffect(() => {
    if (open) {
      setError('');
      setCounted(summary?.expected_cash != null ? String(Number(summary.expected_cash).toFixed(2)) : '');
    }
  }, [open, summary?.expected_cash]);

  const closeMutation = useMutation({
    mutationFn: async () => {
      const closingCash = parseFloat(counted);
      if (!Number.isFinite(closingCash) || closingCash < 0) {
        throw new Error('Enter counted cash');
      }
      let drawerResult = null;
      if (drawerSessionId) {
        const res = await api.post(`/drawer/${drawerSessionId}/close`, { closing_cash: closingCash });
        drawerResult = res.data.data;
      }
      let shiftResult = null;
      if (shiftId) {
        const res = await api.post(`/shifts/${shiftId}/clock-out`, { notes: 'Closed from POS register' });
        shiftResult = res.data.data;
      }
      return { drawerResult, shiftResult };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['drawer-open']);
      queryClient.invalidateQueries(['shifts-current']);
      queryClient.invalidateQueries(['shifts']);
      onClosed?.();
      onClose();
    },
    onError: (err) => setError(friendlyPosError(err, err.message || 'Close failed')),
  });

  const report = reportData?.report;
  const expected = summary?.expected_cash;
  const variance = Number.isFinite(parseFloat(counted)) && expected != null
    ? +(parseFloat(counted) - Number(expected)).toFixed(2)
    : null;

  return (
    <CodexModal
      opened={open}
      onClose={closeMutation.isPending ? () => {} : onClose}
      closeOnClickOutside={!closeMutation.isPending}
      closeOnEscape={!closeMutation.isPending}
      size="md"
      title={
        <Group gap="xs">
          {isClose ? <LockClock /> : <Assessment />}
          <span>{isClose ? 'Close register (Z)' : 'X report'}</span>
        </Group>
      }
    >
      <Stack gap="md">
        {error && <Alert color="red">{error}</Alert>}

        {(reportLoading || (isClose && summaryLoading)) ? (
          <Center py="xl"><Loader size="sm" /></Center>
        ) : (
          <>
            {report && (
              <Box p="md" style={{ borderRadius: 8, background: 'var(--mantine-color-gray-0)' }}>
                <Text fw={700} size="sm" mb="xs">
                  {reportData?.report_type || (isClose ? 'Z' : 'X')} report
                </Text>
                <Row label="Orders" value={String(report.order_count ?? 0)} />
                <Row label="Gross sales" value={formatMoney(report.gross_sales)} />
                <Row label="Tax" value={formatMoney(report.tax_total)} />
                <Row label="Discounts" value={formatMoney(report.discount_total)} />
                <Row label="Tips" value={formatMoney(report.tip_total)} />
                <Divider my="sm" />
                <Row label="Cash tenders" value={formatMoney(report.cash_sales)} />
                <Row label="Card tenders" value={formatMoney(report.card_sales)} />
                <Row label="Other tenders" value={formatMoney(report.other_sales)} />
              </Box>
            )}

            {isClose && summary && (
              <Box p="md" style={{ borderRadius: 8, background: 'var(--mantine-color-gray-0)' }}>
                <Text fw={700} size="sm" mb="xs">Cash drawer</Text>
                <Row label="Opening" value={formatMoney(summary.opening_float)} />
                <Row label="+ Cash sales" value={formatMoney(summary.cash_sales)} />
                <Row label="+ Cash in" value={formatMoney(summary.cash_in)} />
                <Row label="− Refunds" value={formatMoney(summary.cash_refunds)} />
                <Row label="− Cash out" value={formatMoney(summary.cash_out)} />
                <Divider my="sm" />
                <Row label="Expected" value={formatMoney(summary.expected_cash)} bold />
                <CodexInput
                  type="number"
                  label="Counted cash"
                  value={counted}
                  onChange={(e) => setCounted(e.target.value)}
                  mt="md"
                  min={0}
                  step={0.01}
                />
                {variance != null && (
                  <Text
                    size="sm"
                    mt="xs"
                    c={Math.abs(variance) < 0.01 ? 'teal' : 'yellow'}
                  >
                    Variance: {formatMoney(variance)}
                  </Text>
                )}
              </Box>
            )}

            {!isClose && (
              <Alert color="blue">
                X report is a mid-shift snapshot. Closing the register produces a Z report and ends the shift.
              </Alert>
            )}
          </>
        )}

        <Divider />

        <Group justify="flex-end" gap="sm">
          <CodexButton variant="default" onClick={onClose} disabled={closeMutation.isPending} touch>
            {isClose ? 'Cancel' : 'Close'}
          </CodexButton>
          {isClose && (
            <CodexButton
              color="yellow"
              disabled={closeMutation.isPending || (!drawerSessionId && !shiftId)}
              onClick={() => closeMutation.mutate()}
              touch
            >
              {closeMutation.isPending ? 'Closing…' : 'Close register'}
            </CodexButton>
          )}
        </Group>
      </Stack>
    </CodexModal>
  );
}

function Row({ label, value, bold }) {
  return (
    <Group justify="space-between" py={2}>
      <Text size="sm" c="dimmed">{label}</Text>
      <Text size="sm" fw={bold ? 800 : 600}>{value}</Text>
    </Group>
  );
}
