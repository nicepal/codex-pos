import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Text, Group, Alert, Badge, Box, Divider, Center, Loader, ScrollArea,
} from '@mantine/core';
import { Print } from '@mui/icons-material';
import { CodexModal, CodexButton } from '../../design-system';
import api from '../../services/api';
import { friendlyPosError } from './posErrors';

/**
 * Print station UX — lists queued print jobs. Honest: no local agent drain in-browser.
 */
export default function HardwareDialog({ open, onClose }) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['print-jobs'],
    queryFn: () => api.get('/print/jobs', { params: { limit: 20 } }).then((r) => r.data.data),
    enabled: open,
  });

  const claimMutation = useMutation({
    mutationFn: () => api.post('/print/jobs/claim'),
    onSuccess: () => queryClient.invalidateQueries(['print-jobs']),
  });

  const jobs = Array.isArray(data)
    ? data
    : (Array.isArray(data?.data) ? data.data : (data?.rows || []));

  return (
    <CodexModal
      opened={open}
      onClose={onClose}
      size="md"
      title={
        <Group gap="xs">
          <Print />
          <span>Hardware / print station</span>
        </Group>
      }
    >
      <Stack gap="md">
        <Alert color="blue">
          Receipts print via browser dialog or a print-agent claiming jobs from this queue.
          CodexPOS does not drive a payment terminal in this build — card sales remain record-only.
        </Alert>
        {error && (
          <Alert color="red">
            {friendlyPosError(error, 'Could not load print jobs')}
          </Alert>
        )}
        {isLoading ? (
          <Center py="xl"><Loader size="sm" /></Center>
        ) : !jobs?.length ? (
          <Text c="dimmed" ta="center" py="md">
            No queued print jobs
          </Text>
        ) : (
          <ScrollArea.Autosize mah={320}>
            <Stack gap="xs">
              {jobs.map((j) => (
                <Box
                  key={j.id}
                  py="xs"
                  style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
                >
                  <Group gap="xs">
                    <Text size="sm" fw={600}>{j.job_type || j.type || 'receipt'}</Text>
                    <Badge size="sm">{j.status || 'queued'}</Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {j.created_at ? new Date(j.created_at).toLocaleString() : j.id}
                  </Text>
                </Box>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        )}

        <Divider />

        <Group justify="flex-end" gap="sm" wrap="wrap">
          <CodexButton variant="default" onClick={() => refetch()} disabled={isFetching} touch>
            Refresh
          </CodexButton>
          <CodexButton
            variant="outline"
            disabled={claimMutation.isPending}
            onClick={() => claimMutation.mutate()}
            touch
          >
            Claim next (agent)
          </CodexButton>
          <CodexButton variant="default" onClick={onClose} touch>
            Close
          </CodexButton>
        </Group>
      </Stack>
    </CodexModal>
  );
}
