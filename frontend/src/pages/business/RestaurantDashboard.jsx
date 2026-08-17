import { useQuery } from '@tanstack/react-query';
import { Box, SimpleGrid, Paper, Text, Group, Title } from '@mantine/core';
import { Restaurant, TableRestaurant, Settings, People } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import api from '../../services/api';
import FeatureGate from '../../components/FeatureGate';
import { CodexButton, CodexSelect } from '../../design-system';

function StatCard({ label, value, color }) {
  return (
    <Paper withBorder p="md" radius="md" h="100%">
      <Text size="sm" c="dimmed" mb={4}>{label}</Text>
      <Text fz={28} fw={700} c={color}>{value ?? '—'}</Text>
    </Paper>
  );
}

export default function RestaurantDashboard() {
  const navigate = useNavigate();
  const [branchId, setBranchId] = useState('');

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches', { params: { limit: 50 } }).then((r) => r.data.data),
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ['restaurant-dashboard', branchId],
    queryFn: () => api.get('/restaurant/dashboard', {
      params: branchId ? { branch_id: branchId } : {},
    }).then((r) => r.data.data),
  });

  const branchOptions = [
    { value: '', label: 'All branches' },
    ...(branches || []).map((b) => ({ value: String(b.id), label: b.name })),
  ];

  return (
    <FeatureGate pack="restaurant_pro">
      <Box>
        <Group justify="space-between" align="flex-start" mb="lg" wrap="wrap">
          <Box>
            <Title order={2}>Restaurant</Title>
            <Text c="dimmed" size="sm">Floor plans, table sessions, and dining overview</Text>
          </Box>
          <Group gap="sm">
            <CodexButton
              variant="outline"
              leftSection={<TableRestaurant fontSize="small" />}
              component={RouterLink}
              to="/restaurant/tables"
            >
              Manage tables
            </CodexButton>
            <CodexButton
              variant="outline"
              leftSection={<Settings fontSize="small" />}
              component={RouterLink}
              to="/restaurant/settings"
            >
              Settings
            </CodexButton>
            <CodexButton color="codex" component={RouterLink} to="/kds">
              Open KDS
            </CodexButton>
          </Group>
        </Group>

        <CodexSelect
          label="Branch"
          mb="md"
          maw={280}
          data={branchOptions}
          value={branchId}
          onChange={(v) => setBranchId(v || '')}
        />

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
          <StatCard label="Active sessions" value={isLoading ? '…' : stats?.active_sessions} />
          <StatCard label="Guests seated" value={isLoading ? '…' : stats?.total_guests} color="teal" />
          <StatCard label="Tables occupied" value={isLoading ? '…' : stats?.tables_occupied} color="yellow" />
          <StatCard label="Tables available" value={isLoading ? '…' : stats?.tables_available} />
          <StatCard label="Total tables" value={isLoading ? '…' : stats?.tables_total} />
          <StatCard label="Floors" value={isLoading ? '…' : stats?.floors} />
        </SimpleGrid>

        <Text fw={700} mt="xl" mb="sm">Kitchen display</Text>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
          <StatCard label="Active tickets" value={isLoading ? '…' : stats?.kds_active} color="blue" />
          <StatCard label="Preparing" value={isLoading ? '…' : stats?.kds_preparing} color="yellow" />
          <StatCard label="Ready" value={isLoading ? '…' : stats?.kds_ready} color="teal" />
          <StatCard label="Overdue" value={isLoading ? '…' : stats?.kds_overdue} color="red" />
          <StatCard label="Completed today" value={isLoading ? '…' : stats?.kds_completed_today} />
        </SimpleGrid>

        {!isLoading && stats?.tables_total === 0 && (
          <Paper withBorder p="xl" mt="xl" ta="center">
            <Restaurant style={{ fontSize: 48, color: 'var(--mantine-color-dimmed)', marginBottom: 8 }} />
            <Title order={4} mb="xs">No tables configured yet</Title>
            <Text c="dimmed" mb="md">
              Create a floor plan and add tables to start managing dining sessions.
            </Text>
            <CodexButton color="codex" onClick={() => navigate('/restaurant/settings')}>
              Set up restaurant
            </CodexButton>
          </Paper>
        )}

        {(stats?.active_sessions > 0) && (
          <Paper withBorder p="md" mt="xl">
            <Group gap="xs" mb="xs">
              <People fontSize="small" />
              <Text fw={700}>Live dining</Text>
            </Group>
            <Text size="sm" c="dimmed">
              {stats.active_sessions} open table session{stats.active_sessions === 1 ? '' : 's'} ·{' '}
              {stats.total_guests} guest{stats.total_guests === 1 ? '' : 's'} seated
            </Text>
            <CodexButton size="compact-sm" variant="subtle" mt="sm" onClick={() => navigate('/restaurant/tables')}>
              View floor plan
            </CodexButton>
          </Paper>
        )}
      </Box>
    </FeatureGate>
  );
}
