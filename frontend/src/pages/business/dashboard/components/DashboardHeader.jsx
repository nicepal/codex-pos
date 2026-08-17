import { Box, Title, Text, Group, SegmentedControl, ActionIcon, Tooltip, Stack } from '@mantine/core';
import { Refresh } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { selectAuth } from '../../../../features/auth/authSlice';

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardHeader({ range, onRangeChange, onRefresh, isRefreshing, generatedAt }) {
  const { user } = useSelector(selectAuth);
  const name = user?.first_name || user?.email?.split('@')[0] || 'there';
  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Group justify="space-between" align="flex-start" mb="lg" gap="md" wrap="wrap">
      <Stack gap={4}>
        <Title order={2} fw={700} style={{ fontSize: '1.5rem' }}>
          {getGreeting()}, {name}
        </Title>
        <Text size="sm" c="dimmed">
          {dateStr}
          {generatedAt ? ` · Updated ${new Date(generatedAt).toLocaleTimeString()}` : ''}
        </Text>
      </Stack>
      <Group gap="sm" wrap="wrap">
        <SegmentedControl
          value={range}
          onChange={onRangeChange}
          data={RANGES}
          size="sm"
        />
        <Tooltip label="Refresh dashboard">
          <ActionIcon variant="default" onClick={onRefresh} disabled={isRefreshing} aria-label="Refresh">
            <Refresh fontSize="small" />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
