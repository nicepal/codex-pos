import { useState, useEffect } from 'react';
import {
  Alert, Badge, Box, Button, Group, NativeSelect, Stack, Text,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Login, Logout, Assessment } from '@mui/icons-material';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import FeatureGate from '../../components/FeatureGate';
import DataTable from '../../components/DataTable';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import { formatDisplayText } from '../../utils/displayText';
import { CodexModal } from '../../design-system';

export default function ShiftsPage() {
  const queryClient = useQueryClient();
  const { formatMoney } = useBusinessCurrency();
  const [employeeId, setEmployeeId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [error, setError] = useState('');
  const [zReport, setZReport] = useState(null);

  const { data: employees } = useQuery({
    queryKey: ['employees', 'shifts'],
    queryFn: () => api.get('/employees', { params: { limit: 100 } }).then((r) => r.data.data),
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches', { params: { limit: 50 } }).then((r) => r.data.data),
  });

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => api.get('/shifts', { params: { limit: 50 } }).then((r) => r.data.data),
  });

  const { data: current } = useQuery({
    queryKey: ['shifts-current', employeeId],
    queryFn: () => api.get('/shifts/current', { params: { employee_id: employeeId } }).then((r) => r.data.data),
    enabled: !!employeeId,
  });

  useEffect(() => {
    if (!employeeId && employees?.length) setEmployeeId(employees[0].id);
  }, [employees, employeeId]);

  useEffect(() => {
    if (!branchId && branches?.length) {
      const primary = branches.find((b) => b.is_primary) || branches[0];
      setBranchId(primary.id);
    }
  }, [branches, branchId]);

  const clockInMutation = useMutation({
    mutationFn: () =>
      api.post('/shifts/clock-in', {
        employee_id: employeeId,
        branch_id: branchId || null,
      }),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries(['shifts']);
      queryClient.invalidateQueries(['shifts-current']);
    },
    onError: (err) => setError(err.response?.data?.message || 'Clock-in failed'),
  });

  const clockOutMutation = useMutation({
    mutationFn: (id) => api.post(`/shifts/${id}/clock-out`, {}),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries(['shifts']);
      queryClient.invalidateQueries(['shifts-current']);
    },
    onError: (err) => setError(err.response?.data?.message || 'Clock-out failed'),
  });

  const loadZReport = async (id) => {
    try {
      const res = await api.get(`/shifts/${id}/z-report`);
      setZReport(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load Z-report');
    }
  };

  const columns = [
    {
      field: 'employee',
      label: 'Employee',
      render: (r) =>
        r.employee_name || r.name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || '—',
    },
    { field: 'branch_name', label: 'Branch', render: (r) => r.branch_name || '—' },
    {
      field: 'clock_in',
      label: 'Clock in',
      render: (r) => {
        const t = r.clock_in || r.started_at;
        return t ? new Date(t).toLocaleString() : '—';
      },
    },
    {
      field: 'clock_out',
      label: 'Clock out',
      render: (r) => {
        const t = r.clock_out || r.ended_at;
        return t ? new Date(t).toLocaleString() : '—';
      },
    },
    {
      field: 'status',
      label: 'Status',
      render: (r) => {
        const open = (r.status || '').includes('open') || !(r.clock_out || r.ended_at);
        return (
          <Badge size="sm" color={open ? 'green' : 'gray'}>
            {formatDisplayText(r.status || (r.clock_out || r.ended_at ? 'closed' : 'open'))}
          </Badge>
        );
      },
    },
    {
      field: 'actions',
      label: '',
      render: (r) => (
        <Button
          size="compact-sm"
          variant="default"
          leftSection={<Assessment fontSize="small" />}
          onClick={(e) => {
            e.stopPropagation();
            loadZReport(r.id);
          }}
        >
          Z-report
        </Button>
      ),
    },
  ];

  const report = zReport?.report;

  return (
    <FeatureGate pack="staff_pro">
      <Box>
        <PageHeader title="Shifts" subtitle="Clock employees in and out, and review shift Z-reports" />

        {error ? (
          <Alert color="red" mb="md" withCloseButton onClose={() => setError('')}>
            {error}
          </Alert>
        ) : null}

        <Group mb="lg" align="flex-end" wrap="wrap" gap="md">
          <NativeSelect
            label="Employee"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.currentTarget.value)}
            w={220}
            data={(employees || []).map((e) => ({
              value: String(e.id),
              label: e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim(),
            }))}
          />
          <NativeSelect
            label="Branch"
            value={branchId}
            onChange={(e) => setBranchId(e.currentTarget.value)}
            w={200}
            data={[
              { value: '', label: 'Default' },
              ...(branches || []).map((b) => ({ value: String(b.id), label: b.name })),
            ]}
          />
          {current ? (
            <Button
              color="yellow"
              leftSection={<Logout />}
              loading={clockOutMutation.isPending}
              onClick={() => clockOutMutation.mutate(current.id)}
            >
              Clock out
            </Button>
          ) : (
            <Button
              leftSection={<Login />}
              disabled={!employeeId}
              loading={clockInMutation.isPending}
              onClick={() => clockInMutation.mutate()}
            >
              Clock in
            </Button>
          )}
          {current ? (
            <Text size="sm" c="dimmed">
              Open since {new Date(current.clock_in || current.started_at).toLocaleString()}
            </Text>
          ) : null}
        </Group>

        <DataTable
          columns={columns}
          rows={shifts || []}
          loading={isLoading}
          emptyTitle="No shifts yet"
          emptyMessage="Clock in an employee to start tracking a shift."
        />

        <CodexModal opened={!!zReport} onClose={() => setZReport(null)} title="Shift Z-report" size="sm">
          {report ? (
            <Stack gap="xs">
              <Text>Orders: {report.order_count}</Text>
              <Text>Gross sales: {formatMoney(report.gross_sales)}</Text>
              <Text>Tax: {formatMoney(report.tax_total)}</Text>
              <Text>Discounts: {formatMoney(report.discount_total)}</Text>
              <Text>Cash: {formatMoney(report.cash_sales)}</Text>
              <Text>Card: {formatMoney(report.card_sales)}</Text>
              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={() => setZReport(null)}>
                  Close
                </Button>
              </Group>
            </Stack>
          ) : null}
        </CodexModal>
      </Box>
    </FeatureGate>
  );
}
