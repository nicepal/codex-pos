import { useState } from 'react';
import {
  Alert, Box, Button, Card, Group, NativeSelect, SimpleGrid, Stack, Text, TextInput, Title, Tabs,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Add } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import FeatureGate from '../../components/FeatureGate';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import RHFTextField from '../../components/RHFTextField';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import { formatDisplayText } from '../../utils/displayText';

export default function AccountingPage() {
  const queryClient = useQueryClient();
  const { formatMoney } = useBusinessCurrency();
  const [tab, setTab] = useState('accounts');
  const [accountOpen, setAccountOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [error, setError] = useState('');
  const [journalLines, setJournalLines] = useState([
    { account_id: '', debit: '', credit: '' },
    { account_id: '', debit: '', credit: '' },
  ]);
  const accountForm = useForm({ defaultValues: { code: '', name: '', type: 'asset' } });
  const journalForm = useForm({ defaultValues: { memo: '', entry_date: new Date().toISOString().slice(0, 10) } });

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounting-accounts'],
    queryFn: () => api.get('/accounting/accounts').then((r) => r.data.data),
  });

  const { data: journals, isLoading: journalsLoading } = useQuery({
    queryKey: ['accounting-journals'],
    queryFn: () => api.get('/accounting/journals', { params: { limit: 50 } }).then((r) => r.data.data),
    enabled: tab === 'journals',
  });

  const { data: pnl, isLoading: pnlLoading } = useQuery({
    queryKey: ['accounting-pnl'],
    queryFn: () => api.get('/accounting/reports/profit-loss').then((r) => r.data.data),
    enabled: tab === 'pnl',
  });

  const { data: taxReport, isLoading: taxLoading } = useQuery({
    queryKey: ['accounting-tax'],
    queryFn: () => api.get('/accounting/reports/tax').then((r) => r.data.data),
    enabled: tab === 'tax',
  });

  const createAccount = useMutation({
    mutationFn: (payload) => api.post('/accounting/accounts', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['accounting-accounts']);
      setAccountOpen(false);
      accountForm.reset();
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to create account'),
  });

  const createJournal = useMutation({
    mutationFn: (payload) => api.post('/accounting/journals', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['accounting-journals']);
      setJournalOpen(false);
      journalForm.reset();
      setJournalLines([
        { account_id: '', debit: '', credit: '' },
        { account_id: '', debit: '', credit: '' },
      ]);
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to create journal'),
  });

  const submitJournal = journalForm.handleSubmit((values) => {
    const lines = journalLines
      .filter((l) => l.account_id)
      .map((l) => ({
        account_id: l.account_id,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      }));
    createJournal.mutate({ ...values, lines });
  });

  const taxRows = Array.isArray(taxReport) ? taxReport : (taxReport?.rows || taxReport?.days || []);

  return (
    <FeatureGate pack="finance_pro">
      <Box>
        <PageHeader title="Accounting" subtitle="Chart of accounts, journals, and financial reports" />
        {error ? (
          <Alert color="red" mb="md" withCloseButton onClose={() => setError('')}>
            {error}
          </Alert>
        ) : null}

        <Tabs value={tab} onChange={setTab} mb="md">
          <Tabs.List>
            <Tabs.Tab value="accounts">Accounts</Tabs.Tab>
            <Tabs.Tab value="journals">Journals</Tabs.Tab>
            <Tabs.Tab value="pnl">P&L</Tabs.Tab>
            <Tabs.Tab value="tax">Tax report</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="accounts" pt="md">
            <Button leftSection={<Add />} mb="md" onClick={() => setAccountOpen(true)}>
              Add account
            </Button>
            <DataTable
              columns={[
                { field: 'code', label: 'Code' },
                { field: 'name', label: 'Name' },
                { field: 'type', label: 'Type', render: (r) => formatDisplayText(r.type) },
              ]}
              rows={accounts || []}
              loading={accountsLoading}
              emptyTitle="No accounts"
              emptyMessage="Default ledger accounts will seed on first use, or add your own."
            />
          </Tabs.Panel>

          <Tabs.Panel value="journals" pt="md">
            <Button leftSection={<Add />} mb="md" onClick={() => setJournalOpen(true)}>
              New journal
            </Button>
            <DataTable
              columns={[
                { field: 'entry_number', label: 'Entry #' },
                {
                  field: 'entry_date',
                  label: 'Date',
                  render: (r) => (r.entry_date ? new Date(r.entry_date).toLocaleDateString() : '—'),
                },
                { field: 'memo', label: 'Memo', render: (r) => r.memo || '—' },
                {
                  field: 'created_at',
                  label: 'Created',
                  render: (r) => (r.created_at ? new Date(r.created_at).toLocaleString() : '—'),
                },
              ]}
              rows={journals || []}
              loading={journalsLoading}
              emptyTitle="No journal entries"
              emptyMessage="Post a balanced journal entry to record accounting activity."
            />
          </Tabs.Panel>

          <Tabs.Panel value="pnl" pt="md">
            {pnlLoading ? (
              <Text c="dimmed">Loading…</Text>
            ) : (
              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                <Card withBorder padding="md">
                  <Text c="dimmed" size="sm">Revenue</Text>
                  <Title order={3}>{formatMoney(pnl?.revenue ?? pnl?.income ?? 0)}</Title>
                </Card>
                <Card withBorder padding="md">
                  <Text c="dimmed" size="sm">Expenses</Text>
                  <Title order={3}>{formatMoney(pnl?.expenses ?? pnl?.expense ?? 0)}</Title>
                </Card>
                <Card withBorder padding="md">
                  <Text c="dimmed" size="sm">Net profit</Text>
                  <Title order={3}>{formatMoney(pnl?.net_profit ?? pnl?.profit ?? 0)}</Title>
                </Card>
              </SimpleGrid>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="tax" pt="md">
            <DataTable
              columns={[
                { field: 'day', label: 'Day', render: (r) => r.day || r.date || r.period || '—' },
                {
                  field: 'tax_amount',
                  label: 'Tax',
                  render: (r) => formatMoney(r.tax_amount ?? r.total_tax ?? r.tax ?? 0),
                },
                { field: 'order_count', label: 'Orders', render: (r) => r.order_count ?? r.orders ?? '—' },
              ]}
              rows={taxRows}
              loading={taxLoading}
              emptyTitle="No tax data"
              emptyMessage="Tax collected from orders will appear here by day."
            />
          </Tabs.Panel>
        </Tabs>

        <FormDialog
          open={accountOpen}
          title="Add account"
          onClose={() => setAccountOpen(false)}
          onSubmit={accountForm.handleSubmit((v) => createAccount.mutate(v))}
          loading={createAccount.isPending}
          submitLabel="Create"
        >
          <RHFTextField register={accountForm.register} name="code" rules={{ required: true }} label="Code" />
          <RHFTextField register={accountForm.register} name="name" rules={{ required: true }} label="Name" />
          <NativeSelect
            label="Type"
            w="100%"
            {...accountForm.register('type')}
            data={['asset', 'liability', 'equity', 'revenue', 'expense', 'cogs'].map((t) => ({
              value: t,
              label: formatDisplayText(t),
            }))}
          />
        </FormDialog>

        <FormDialog
          open={journalOpen}
          title="New journal entry"
          onClose={() => setJournalOpen(false)}
          onSubmit={submitJournal}
          loading={createJournal.isPending}
          submitLabel="Post"
        >
          <RHFTextField register={journalForm.register} name="entry_date" label="Date" type="date" />
          <RHFTextField register={journalForm.register} name="memo" label="Memo" />
          {journalLines.map((line, idx) => (
            <Group key={idx} align="flex-end" grow wrap="wrap">
              <NativeSelect
                label="Account"
                style={{ flex: 2, minWidth: 180 }}
                value={line.account_id}
                onChange={(e) => {
                  const next = [...journalLines];
                  next[idx] = { ...next[idx], account_id: e.currentTarget.value };
                  setJournalLines(next);
                }}
                data={[
                  { value: '', label: 'Select account' },
                  ...(accounts || []).map((a) => ({ value: String(a.id), label: `${a.code} — ${a.name}` })),
                ]}
              />
              <TextInput
                label="Debit"
                type="number"
                w={120}
                value={line.debit}
                onChange={(e) => {
                  const next = [...journalLines];
                  next[idx] = { ...next[idx], debit: e.currentTarget.value };
                  setJournalLines(next);
                }}
              />
              <TextInput
                label="Credit"
                type="number"
                w={120}
                value={line.credit}
                onChange={(e) => {
                  const next = [...journalLines];
                  next[idx] = { ...next[idx], credit: e.currentTarget.value };
                  setJournalLines(next);
                }}
              />
            </Group>
          ))}
          <Button
            size="sm"
            variant="default"
            onClick={() => setJournalLines([...journalLines, { account_id: '', debit: '', credit: '' }])}
          >
            Add line
          </Button>
        </FormDialog>
      </Box>
    </FeatureGate>
  );
}
