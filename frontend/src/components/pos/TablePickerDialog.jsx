import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Text, Group, Box, Alert, SimpleGrid, Badge, Center, Loader,
  SegmentedControl, Divider,
} from '@mantine/core';
import { CodexModal, CodexButton, CodexInput, CodexSelect } from '../../design-system';
import CustomerSelector from './CustomerSelector';
import api from '../../services/api';
import { employeeLabel } from './posHelpers';

const STATUS_COLORS = {
  available: 'teal',
  occupied: 'yellow',
  reserved: 'blue',
  cleaning: 'gray',
};

export default function TablePickerDialog({
  open,
  onClose,
  branchId,
  onSessionReady,
  employees = [],
  customers = [],
  defaultGuestCount = 2,
  online = true,
}) {
  const queryClient = useQueryClient();
  const [floorId, setFloorId] = useState('');
  const [selectedTable, setSelectedTable] = useState(null);
  const [guestCount, setGuestCount] = useState(defaultGuestCount);
  const [serverEmployeeId, setServerEmployeeId] = useState('');
  const [customerMode, setCustomerMode] = useState('walk_in');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [occupiedOrder, setOccupiedOrder] = useState(null);
  const [error, setError] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const { data: floors = [], isLoading: floorsLoading } = useQuery({
    queryKey: ['restaurant-floors', branchId],
    queryFn: () => api.get('/restaurant/floors', { params: { branch_id: branchId || undefined } })
      .then((r) => r.data.data),
    enabled: open && online,
  });

  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ['restaurant-tables', branchId, floorId],
    queryFn: () => api.get('/restaurant/tables', {
      params: { branch_id: branchId || undefined, floor_id: floorId || undefined },
    }).then((r) => r.data.data),
    enabled: open && online,
  });

  const effectiveFloorId = floorId || floors[0]?.id || '';

  const floorTables = useMemo(
    () => tables.filter((t) => !effectiveFloorId || t.floor_id === effectiveFloorId),
    [tables, effectiveFloorId]
  );

  const employeeOptions = [
    { value: '', label: 'None' },
    ...employees.map((e) => ({ value: String(e.id), label: employeeLabel(e) })),
  ];

  const floorOptions = floors.map((f) => ({ value: String(f.id), label: f.name }));

  const resolveCustomer = async () => {
    if (customerMode === 'walk_in') return null;
    if (customerMode === 'existing') return selectedCustomer;
    if (!newCustomerName.trim()) {
      setError('Enter a name for the new customer');
      return undefined;
    }
    setCreatingCustomer(true);
    try {
      const res = await api.post('/customers', {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
      });
      return res.data.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create customer');
      return undefined;
    } finally {
      setCreatingCustomer(false);
    }
  };

  const openMutation = useMutation({
    mutationFn: ({ tableId, body }) => api.post(`/restaurant/tables/${tableId}/open`, body),
    onSuccess: async (res, vars) => {
      const session = res.data.data;
      const table = floorTables.find((t) => t.id === vars.tableId) || selectedTable;
      const customer = vars.customer || null;
      onSessionReady({
        diningSessionId: session.id,
        tableId: vars.tableId,
        tableName: table?.name,
        floorName: table?.floor_name,
        guestCount: session.guest_count,
        serverEmployeeId: session.employee_id,
        serverName: employees.find((e) => e.id === session.employee_id)
          ? employeeLabel(employees.find((e) => e.id === session.employee_id))
          : undefined,
        existingOrderId: null,
        customer,
      });
      queryClient.invalidateQueries(['restaurant-tables']);
      handleClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not open table'),
  });

  const resolveOccupiedTable = () => {
    if (occupiedOrder?.table) return occupiedOrder.table;
    if (selectedTable) return selectedTable;
    const sessionTableId = occupiedOrder?.session?.table_id;
    if (sessionTableId) {
      return floorTables.find((t) => t.id === sessionTableId) || null;
    }
    return null;
  };

  const loadOccupiedOrder = async (table) => {
    setError('');
    setSelectedTable(table);
    try {
      const res = await api.get(`/restaurant/tables/${table.id}/active-order`);
      const { session, order } = res.data.data;
      if (!session?.id) {
        setOccupiedOrder(null);
        setError('No active session on this table');
        return;
      }
      setOccupiedOrder({ session, order: order || null, table });
      setGuestCount(session.guest_count || defaultGuestCount);
      setServerEmployeeId(session.employee_id || '');
    } catch (err) {
      setOccupiedOrder(null);
      setError(err.response?.data?.message || 'Could not load table order');
    }
  };

  const confirmOccupied = async () => {
    if (!occupiedOrder?.session?.id) return;
    const table = resolveOccupiedTable();
    if (!table?.id) {
      setError('Table reference lost — select the table again');
      return;
    }
    try {
      const customer = await resolveCustomer();
      if (customer === undefined) return;
      if (typeof onSessionReady !== 'function') {
        setError('Could not attach table session');
        return;
      }
      onSessionReady({
        diningSessionId: occupiedOrder.session.id,
        tableId: table.id,
        tableName: table.name || occupiedOrder.session.table_name,
        floorName: table.floor_name,
        guestCount: occupiedOrder.session.guest_count,
        serverEmployeeId: occupiedOrder.session.employee_id,
        serverName: occupiedOrder.session.employee_id
          ? employeeLabel(employees.find((e) => e.id === occupiedOrder.session.employee_id))
          : undefined,
        existingOrderId: occupiedOrder.order?.id || null,
        orderItems: occupiedOrder.order?.items || [],
        customer,
      });
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not open order');
    }
  };

  const confirmAvailable = async () => {
    if (!selectedTable) return;
    if (!online) {
      setError('Restaurant table synchronization requires an online connection');
      return;
    }
    const customer = await resolveCustomer();
    if (customer === undefined) return;
    openMutation.mutate({
      tableId: selectedTable.id,
      body: {
        guest_count: parseInt(guestCount, 10) || defaultGuestCount,
        employee_id: serverEmployeeId || null,
      },
      customer,
    });
  };

  const handleTableClick = (table) => {
    setOccupiedOrder(null);
    setError('');
    if (table.status === 'occupied' || table.session_id) {
      loadOccupiedOrder(table);
      return;
    }
    if (table.status === 'available' || table.status === 'cleaning') {
      setSelectedTable(table);
      setGuestCount(defaultGuestCount);
      setServerEmployeeId('');
      return;
    }
    setError(`Table is ${table.status}`);
  };

  const handleClose = () => {
    setSelectedTable(null);
    setOccupiedOrder(null);
    setError('');
    setCustomerMode('walk_in');
    setSelectedCustomer(null);
    setNewCustomerName('');
    setNewCustomerPhone('');
    onClose();
  };

  const guestDetailsSection = (showForOccupied = false) => (
    <Stack gap="sm" mt="md">
      <Text fw={700} size="sm">
        {showForOccupied ? 'Guest details (optional)' : 'Guest details'}
      </Text>
      <SegmentedControl
        fullWidth
        value={customerMode}
        onChange={setCustomerMode}
        data={[
          { label: 'Walk-in', value: 'walk_in' },
          { label: 'Existing', value: 'existing' },
          { label: 'New', value: 'new' },
        ]}
      />
      {customerMode === 'existing' && (
        <CustomerSelector
          customer={selectedCustomer}
          customers={customers}
          onChange={setSelectedCustomer}
        />
      )}
      {customerMode === 'new' && (
        <Group grow>
          <CodexInput
            label="Name"
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            required
          />
          <CodexInput
            label="Phone (optional)"
            value={newCustomerPhone}
            onChange={(e) => setNewCustomerPhone(e.target.value)}
          />
        </Group>
      )}
      {!showForOccupied && (
        <Group grow>
          <CodexInput
            type="number"
            label="Guest count"
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            min={1}
            max={99}
          />
          <CodexSelect
            label="Server (optional)"
            data={employeeOptions}
            value={serverEmployeeId ? String(serverEmployeeId) : ''}
            onChange={(v) => setServerEmployeeId(v || '')}
          />
        </Group>
      )}
    </Stack>
  );

  if (!online && open) {
    return (
      <CodexModal opened={open} onClose={handleClose} size="sm" title="Select table">
        <Stack gap="md">
          <Alert color="yellow">
            Restaurant table synchronization requires an online connection.
          </Alert>
          <Group justify="flex-end">
            <CodexButton variant="default" onClick={handleClose} touch>Close</CodexButton>
          </Group>
        </Stack>
      </CodexModal>
    );
  }

  return (
    <CodexModal opened={open} onClose={handleClose} size="lg" title="Select table">
      <Stack gap="md">
        {error ? (
          <Alert color="red" withCloseButton onClose={() => setError('')}>{error}</Alert>
        ) : null}

        {floorOptions.length > 0 && (
          <CodexSelect
            label="Floor"
            data={floorOptions}
            value={effectiveFloorId ? String(effectiveFloorId) : null}
            onChange={(v) => { setFloorId(v || ''); setSelectedTable(null); setOccupiedOrder(null); }}
          />
        )}

        {(floorsLoading || tablesLoading) ? (
          <Center py="xl"><Loader /></Center>
        ) : (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
            {floorTables.map((table) => {
              const selected = selectedTable?.id === table.id;
              return (
                <Box
                  key={table.id}
                  onClick={() => handleTableClick(table)}
                  p="md"
                  style={{
                    border: `2px solid ${selected ? 'var(--mantine-color-codex-6)' : 'var(--mantine-color-gray-3)'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: selected ? 'var(--mantine-color-codex-0)' : 'var(--mantine-color-body)',
                    minHeight: 88,
                  }}
                >
                  <Text fw={700}>{table.name}</Text>
                  <Text size="xs" c="dimmed">Seats {table.capacity}</Text>
                  <Badge size="sm" mt={6} color={STATUS_COLORS[table.status] || 'gray'}>
                    {table.status}
                  </Badge>
                </Box>
              );
            })}
          </SimpleGrid>
        )}

        {occupiedOrder?.session ? (
          <Box p="md" style={{ borderRadius: 10, background: 'var(--mantine-color-gray-0)' }}>
            <Text fw={700} mb={4}>Occupied table</Text>
            <Text size="sm" c="dimmed" mb={4}>
              {occupiedOrder.order
                ? `Open order #${occupiedOrder.order.order_number} · ${occupiedOrder.order.items?.length || 0} items`
                : 'Session open — no pending order yet'}
            </Text>
            <Text size="xs" c="dimmed">
              Guests: {occupiedOrder.session.guest_count}
            </Text>
            {guestDetailsSection(true)}
          </Box>
        ) : null}

        {selectedTable && !occupiedOrder?.session
          && (selectedTable.status === 'available' || selectedTable.status === 'cleaning') ? (
            guestDetailsSection(false)
          ) : null}

        <Divider />

        <Group justify="flex-end" gap="sm">
          <CodexButton variant="default" onClick={handleClose} touch>
            Cancel
          </CodexButton>
          {occupiedOrder?.session ? (
            <CodexButton
              color="codex"
              onClick={confirmOccupied}
              disabled={creatingCustomer}
              touch
            >
              {creatingCustomer ? 'Saving…' : 'Open order'}
            </CodexButton>
          ) : (
            <CodexButton
              color="codex"
              disabled={!selectedTable || openMutation.isPending || creatingCustomer}
              onClick={confirmAvailable}
              touch
            >
              {openMutation.isPending || creatingCustomer ? 'Opening…' : 'Start session'}
            </CodexButton>
          )}
        </Group>
      </Stack>
    </CodexModal>
  );
}
