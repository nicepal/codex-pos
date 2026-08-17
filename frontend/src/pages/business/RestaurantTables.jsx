import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Group, Stack, Text, Title, Paper, Badge, SimpleGrid, Alert, Divider,
} from '@mantine/core';
import { Add, Close, PlayArrow } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import api from '../../services/api';
import FeatureGate from '../../components/FeatureGate';
import { CodexButton, CodexInput, CodexSelect, CodexModal } from '../../design-system';

const STATUS_COLORS = {
  available: 'teal',
  occupied: 'yellow',
  reserved: 'blue',
  cleaning: 'gray',
};

function TableTile({ table, onOpen, onClose, opening, closing }) {
  const hasSession = Boolean(table.session_id);
  const shapeRadius = table.shape === 'round' ? '50%' : 10;

  return (
    <Paper
      withBorder
      p="md"
      style={{
        minHeight: 120,
        borderRadius: shapeRadius,
        borderColor: hasSession ? 'var(--mantine-color-yellow-5)' : undefined,
        background: hasSession ? 'var(--mantine-color-yellow-0)' : undefined,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Group justify="space-between" align="flex-start">
        <Box>
          <Text fw={700}>{table.name}</Text>
          <Text size="xs" c="dimmed">Seats {table.capacity}</Text>
        </Box>
        <Badge size="sm" color={STATUS_COLORS[table.status] || 'gray'}>{table.status}</Badge>
      </Group>

      {hasSession && (
        <Text size="sm" c="dimmed" mt="xs">
          {table.session_guest_count} guest{table.session_guest_count === 1 ? '' : 's'} · open
        </Text>
      )}

      <Group gap="xs" mt="sm">
        {!hasSession ? (
          <CodexButton
            size="compact-sm"
            color="codex"
            leftSection={<PlayArrow fontSize="small" />}
            disabled={table.status === 'reserved' || opening}
            onClick={() => onOpen(table)}
          >
            Open
          </CodexButton>
        ) : (
          <CodexButton
            size="compact-sm"
            variant="outline"
            leftSection={<Close fontSize="small" />}
            disabled={closing}
            onClick={() => onClose(table)}
          >
            Close
          </CodexButton>
        )}
      </Group>
    </Paper>
  );
}

export default function RestaurantTables() {
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [tableOpen, setTableOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    capacity: 4,
    position_x: 0,
    position_y: 0,
    shape: 'square',
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches', { params: { limit: 50 } }).then((r) => r.data.data),
  });

  const effectiveBranchId = branchId || branches?.[0]?.id || '';

  const { data: floors } = useQuery({
    queryKey: ['restaurant-floors', effectiveBranchId],
    queryFn: () => api.get('/restaurant/floors', {
      params: { branch_id: effectiveBranchId },
    }).then((r) => r.data.data),
    enabled: Boolean(effectiveBranchId),
  });

  const effectiveFloorId = floorId || floors?.[0]?.id || '';

  const { data: tables, isLoading } = useQuery({
    queryKey: ['restaurant-tables', effectiveBranchId, effectiveFloorId],
    queryFn: () => api.get('/restaurant/tables', {
      params: {
        branch_id: effectiveBranchId,
        floor_id: effectiveFloorId || undefined,
      },
    }).then((r) => r.data.data),
    enabled: Boolean(effectiveBranchId),
  });

  const gridTables = useMemo(() => {
    const list = tables || [];
    const maxX = Math.max(0, ...list.map((t) => t.position_x || 0));
    const maxY = Math.max(0, ...list.map((t) => t.position_y || 0));
    const rows = maxY + 1;
    const cols = Math.max(maxX + 1, 3);
    const cells = Array.from({ length: rows * cols }, () => null);
    list.forEach((t) => {
      const idx = (t.position_y || 0) * cols + (t.position_x || 0);
      cells[idx] = t;
    });
    return { cells, cols, rows };
  }, [tables]);

  const openSession = useMutation({
    mutationFn: (tableId) => api.post(`/restaurant/tables/${tableId}/open`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurant-tables']);
      queryClient.invalidateQueries(['restaurant-dashboard']);
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to open table'),
  });

  const closeSession = useMutation({
    mutationFn: (tableId) => api.post(`/restaurant/tables/${tableId}/close`),
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurant-tables']);
      queryClient.invalidateQueries(['restaurant-dashboard']);
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to close table'),
  });

  const createTable = useMutation({
    mutationFn: (payload) => api.post('/restaurant/tables', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurant-tables']);
      queryClient.invalidateQueries(['restaurant-dashboard']);
      setTableOpen(false);
      setForm({ name: '', capacity: 4, position_x: 0, position_y: 0, shape: 'square' });
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to create table'),
  });

  const branchOptions = (branches || []).map((b) => ({ value: String(b.id), label: b.name }));
  const floorOptions = (floors || []).map((f) => ({ value: String(f.id), label: f.name }));

  return (
    <FeatureGate pack="restaurant_pro">
      <Box>
        <Group justify="space-between" align="flex-start" mb="lg" wrap="wrap">
          <Box>
            <Title order={2}>Table floor plan</Title>
            <Text c="dimmed" size="sm">Open and close dining sessions by table</Text>
          </Box>
          <CodexButton
            color="codex"
            leftSection={<Add fontSize="small" />}
            disabled={!effectiveFloorId}
            onClick={() => setTableOpen(true)}
          >
            Add table
          </CodexButton>
        </Group>

        {error && (
          <Alert color="red" mb="md" withCloseButton onClose={() => setError('')}>{error}</Alert>
        )}

        <Group gap="md" mb="lg" wrap="wrap">
          <CodexSelect
            label="Branch"
            maw={220}
            data={branchOptions}
            value={effectiveBranchId ? String(effectiveBranchId) : null}
            onChange={(v) => { setBranchId(v || ''); setFloorId(''); }}
          />
          <CodexSelect
            label="Floor"
            maw={220}
            data={floorOptions}
            value={effectiveFloorId ? String(effectiveFloorId) : null}
            onChange={(v) => setFloorId(v || '')}
            disabled={!floors?.length}
          />
          <CodexButton variant="subtle" component={RouterLink} to="/restaurant/settings" style={{ alignSelf: 'flex-end' }}>
            Manage floors
          </CodexButton>
        </Group>

        {!floors?.length && (
          <Paper withBorder p="xl" ta="center">
            <Text c="dimmed" mb="md">
              Add a floor in settings before placing tables.
            </Text>
            <CodexButton color="codex" component={RouterLink} to="/restaurant/settings">
              Go to settings
            </CodexButton>
          </Paper>
        )}

        {floors?.length > 0 && (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
            {gridTables.cells.map((table, idx) => (
              table ? (
                <TableTile
                  key={table.id}
                  table={table}
                  onOpen={(t) => openSession.mutate(t.id)}
                  onClose={(t) => closeSession.mutate(t.id)}
                  opening={openSession.isPending}
                  closing={closeSession.isPending}
                />
              ) : (
                <Paper
                  key={`empty-${idx}`}
                  withBorder
                  p="md"
                  style={{ minHeight: 120, opacity: 0.35, borderStyle: 'dashed' }}
                />
              )
            ))}
            {!isLoading && !tables?.length && (
              <Text c="dimmed" ta="center" style={{ gridColumn: '1 / -1' }}>
                No tables on this floor yet.
              </Text>
            )}
          </SimpleGrid>
        )}

        <CodexModal
          opened={tableOpen}
          onClose={() => setTableOpen(false)}
          title="Add table"
          size="sm"
        >
          <Stack gap="md">
            <CodexInput
              label="Table name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <CodexInput
              label="Capacity"
              type="number"
              required
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            />
            <Group grow>
              <CodexInput
                label="Grid column"
                type="number"
                value={form.position_x}
                onChange={(e) => setForm((f) => ({ ...f, position_x: e.target.value }))}
              />
              <CodexInput
                label="Grid row"
                type="number"
                value={form.position_y}
                onChange={(e) => setForm((f) => ({ ...f, position_y: e.target.value }))}
              />
            </Group>
            <CodexSelect
              label="Shape"
              data={[
                { value: 'square', label: 'Square' },
                { value: 'round', label: 'Round' },
                { value: 'rectangle', label: 'Rectangle' },
              ]}
              value={form.shape}
              onChange={(v) => setForm((f) => ({ ...f, shape: v || 'square' }))}
            />
            <Divider />
            <Group justify="flex-end" gap="sm">
              <CodexButton variant="default" onClick={() => setTableOpen(false)}>Cancel</CodexButton>
              <CodexButton
                color="codex"
                disabled={!form.name.trim() || createTable.isPending}
                onClick={() => createTable.mutate({
                  branch_id: effectiveBranchId,
                  floor_id: effectiveFloorId,
                  name: form.name.trim(),
                  capacity: Number(form.capacity),
                  position_x: Number(form.position_x),
                  position_y: Number(form.position_y),
                  shape: form.shape,
                })}
              >
                {createTable.isPending ? 'Saving…' : 'Add table'}
              </CodexButton>
            </Group>
          </Stack>
        </CodexModal>
      </Box>
    </FeatureGate>
  );
}
