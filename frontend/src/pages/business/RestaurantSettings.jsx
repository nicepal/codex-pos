import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Group, Stack, Text, Title, Paper, SimpleGrid, Alert, Switch, Divider,
} from '@mantine/core';
import { Add, Delete } from '@mui/icons-material';
import api from '../../services/api';
import FeatureGate from '../../components/FeatureGate';
import { CodexButton, CodexInput, CodexSelect, CodexModal } from '../../design-system';

export default function RestaurantSettings() {
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState('');
  const [floorOpen, setFloorOpen] = useState(false);
  const [error, setError] = useState('');
  const [floorName, setFloorName] = useState('');
  const [floorSort, setFloorSort] = useState(0);
  const [prefs, setPrefs] = useState({
    default_guest_count: 2,
    show_capacity_on_floor_plan: true,
    post_close_table_status: 'available',
    enable_reservations: false,
    kitchen_enabled: true,
    warning_after_minutes: 8,
    overdue_after_minutes: 15,
    sound_enabled: true,
    auto_refresh_seconds: 30,
  });
  const [stationName, setStationName] = useState('');

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches', { params: { limit: 50 } }).then((r) => r.data.data),
  });

  const effectiveBranchId = branchId || branches?.[0]?.id || '';

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['restaurant-settings'],
    queryFn: () => api.get('/restaurant/settings').then((r) => r.data.data),
  });

  useEffect(() => {
    if (!settings) return;
    setPrefs({
      default_guest_count: settings.default_guest_count ?? 2,
      show_capacity_on_floor_plan: settings.show_capacity_on_floor_plan !== false,
      post_close_table_status: settings.post_close_table_status || 'available',
      enable_reservations: Boolean(settings.enable_reservations),
      kitchen_enabled: settings.kitchen_enabled !== false,
      warning_after_minutes: settings.warning_after_minutes ?? 8,
      overdue_after_minutes: settings.overdue_after_minutes ?? 15,
      sound_enabled: settings.sound_enabled !== false,
      auto_refresh_seconds: settings.auto_refresh_seconds ?? 30,
    });
  }, [settings]);

  const { data: floors } = useQuery({
    queryKey: ['restaurant-floors', effectiveBranchId],
    queryFn: () => api.get('/restaurant/floors', {
      params: { branch_id: effectiveBranchId },
    }).then((r) => r.data.data),
    enabled: Boolean(effectiveBranchId),
  });

  const { data: stations, refetch: refetchStations } = useQuery({
    queryKey: ['kds-stations', effectiveBranchId],
    queryFn: () => api.get('/restaurant/kds/stations', {
      params: { branch_id: effectiveBranchId },
    }).then((r) => r.data.data),
    enabled: Boolean(effectiveBranchId),
  });

  const saveSettings = useMutation({
    mutationFn: (payload) => api.put('/restaurant/settings', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurant-settings']);
      setError('');
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to save settings'),
  });

  const createFloor = useMutation({
    mutationFn: (payload) => api.post('/restaurant/floors', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurant-floors']);
      setFloorOpen(false);
      setFloorName('');
      setFloorSort(0);
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to create floor'),
  });

  const deleteFloor = useMutation({
    mutationFn: (id) => api.delete(`/restaurant/floors/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['restaurant-floors']),
    onError: (err) => setError(err.response?.data?.message || 'Failed to delete floor'),
  });

  const onSaveSettings = (e) => {
    e.preventDefault();
    saveSettings.mutate({
      ...prefs,
      default_guest_count: Number(prefs.default_guest_count),
      warning_after_minutes: Number(prefs.warning_after_minutes),
      overdue_after_minutes: Number(prefs.overdue_after_minutes),
      auto_refresh_seconds: Number(prefs.auto_refresh_seconds),
    });
  };

  const addStation = async () => {
    if (!stationName.trim() || !effectiveBranchId) return;
    try {
      await api.post('/restaurant/kds/stations', {
        branch_id: effectiveBranchId,
        name: stationName.trim(),
      });
      setStationName('');
      refetchStations();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add station');
    }
  };

  const branchOptions = (branches || []).map((b) => ({ value: String(b.id), label: b.name }));
  const setPref = (key, value) => setPrefs((p) => ({ ...p, [key]: value }));

  return (
    <FeatureGate pack="restaurant_pro">
      <Box>
        <Box mb="lg">
          <Title order={2}>Restaurant settings</Title>
          <Text c="dimmed" size="sm">Floors, defaults, and dining preferences</Text>
        </Box>

        {error && (
          <Alert color="red" mb="md" withCloseButton onClose={() => setError('')}>{error}</Alert>
        )}

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <Paper withBorder p="lg" radius="md">
            <Text fw={700} size="lg" mb="md">Preferences</Text>
            <Stack gap="md" component="form" onSubmit={onSaveSettings}>
              <CodexInput
                label="Default guest count"
                type="number"
                disabled={settingsLoading}
                value={prefs.default_guest_count}
                onChange={(e) => setPref('default_guest_count', e.target.value)}
              />
              <CodexSelect
                label="After close, set table to"
                disabled={settingsLoading}
                data={[
                  { value: 'available', label: 'Available' },
                  { value: 'cleaning', label: 'Needs cleaning' },
                ]}
                value={prefs.post_close_table_status}
                onChange={(v) => setPref('post_close_table_status', v || 'available')}
              />
              <Switch
                label="Show capacity on floor plan"
                checked={prefs.show_capacity_on_floor_plan}
                onChange={(e) => setPref('show_capacity_on_floor_plan', e.currentTarget.checked)}
              />
              <Switch
                label="Enable reservations (Phase 2)"
                checked={prefs.enable_reservations}
                onChange={(e) => setPref('enable_reservations', e.currentTarget.checked)}
              />
              <Switch
                label="Kitchen display enabled"
                checked={prefs.kitchen_enabled}
                onChange={(e) => setPref('kitchen_enabled', e.currentTarget.checked)}
              />
              <CodexInput
                label="Warning after (minutes)"
                type="number"
                value={prefs.warning_after_minutes}
                onChange={(e) => setPref('warning_after_minutes', e.target.value)}
              />
              <CodexInput
                label="Overdue after (minutes)"
                type="number"
                value={prefs.overdue_after_minutes}
                onChange={(e) => setPref('overdue_after_minutes', e.target.value)}
              />
              <CodexInput
                label="KDS auto-refresh (seconds)"
                type="number"
                value={prefs.auto_refresh_seconds}
                onChange={(e) => setPref('auto_refresh_seconds', e.target.value)}
              />
              <Switch
                label="KDS sound notifications"
                checked={prefs.sound_enabled}
                onChange={(e) => setPref('sound_enabled', e.currentTarget.checked)}
              />
              <CodexButton type="submit" color="codex" disabled={saveSettings.isPending}>
                {saveSettings.isPending ? 'Saving…' : 'Save preferences'}
              </CodexButton>
            </Stack>
          </Paper>

          <Paper withBorder p="lg" radius="md">
            <Group justify="space-between" mb="md">
              <Text fw={700} size="lg">Floors</Text>
              <CodexButton
                size="compact-sm"
                leftSection={<Add fontSize="small" />}
                onClick={() => setFloorOpen(true)}
                disabled={!effectiveBranchId}
              >
                Add floor
              </CodexButton>
            </Group>

            <CodexSelect
              label="Branch"
              mb="md"
              data={branchOptions}
              value={effectiveBranchId ? String(effectiveBranchId) : null}
              onChange={(v) => setBranchId(v || '')}
            />

            <Stack gap="xs">
              {(floors || []).map((floor) => (
                <Group
                  key={floor.id}
                  justify="space-between"
                  py="sm"
                  style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
                >
                  <Box>
                    <Text fw={600}>{floor.name}</Text>
                    <Text size="xs" c="dimmed">
                      Sort {floor.sort_order} · {floor.active ? 'Active' : 'Inactive'}
                    </Text>
                  </Box>
                  <CodexButton
                    size="compact-sm"
                    color="red"
                    variant="subtle"
                    leftSection={<Delete fontSize="small" />}
                    onClick={() => deleteFloor.mutate(floor.id)}
                    disabled={deleteFloor.isPending}
                  >
                    Delete
                  </CodexButton>
                </Group>
              ))}
              {!floors?.length && (
                <Text c="dimmed" size="sm">
                  No floors yet. Add a floor to start placing tables.
                </Text>
              )}
            </Stack>
          </Paper>

          <Paper withBorder p="lg" radius="md">
            <Text fw={700} size="lg" mb="md">Kitchen stations</Text>
            <Group gap="sm" mb="md" align="flex-end">
              <CodexInput
                style={{ flex: 1 }}
                label="Station name"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
              />
              <CodexButton color="codex" onClick={addStation} disabled={!effectiveBranchId}>
                Add
              </CodexButton>
            </Group>
            <Stack gap="xs">
              {(stations || []).map((s) => (
                <Text key={s.id} size="sm">
                  {s.name}
                  {!s.is_active && ' (inactive)'}
                </Text>
              ))}
              {!stations?.length && (
                <Text c="dimmed" size="sm">
                  No stations — items route to the default station.
                </Text>
              )}
            </Stack>
          </Paper>
        </SimpleGrid>

        <CodexModal
          opened={floorOpen}
          onClose={() => setFloorOpen(false)}
          title="Add floor"
          size="sm"
        >
          <Stack gap="md">
            <CodexInput
              label="Floor name"
              required
              value={floorName}
              onChange={(e) => setFloorName(e.target.value)}
            />
            <CodexInput
              label="Sort order"
              type="number"
              value={floorSort}
              onChange={(e) => setFloorSort(e.target.value)}
            />
            <Divider />
            <Group justify="flex-end" gap="sm">
              <CodexButton variant="default" onClick={() => setFloorOpen(false)}>Cancel</CodexButton>
              <CodexButton
                color="codex"
                disabled={!floorName.trim() || createFloor.isPending}
                onClick={() => createFloor.mutate({
                  branch_id: effectiveBranchId,
                  name: floorName.trim(),
                  sort_order: Number(floorSort) || 0,
                })}
              >
                {createFloor.isPending ? 'Saving…' : 'Add floor'}
              </CodexButton>
            </Group>
          </Stack>
        </CodexModal>
      </Box>
    </FeatureGate>
  );
}
