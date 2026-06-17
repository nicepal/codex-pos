import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Grid, TextField, MenuItem, IconButton, Button, Stack, Chip, Box, Skeleton,
  Dialog, DialogTitle, DialogContent, DialogActions, Typography, Tooltip,
} from '@mui/material';
import {
  Add, Edit, Delete, Visibility, Download, UploadFile, FileDownload, Category,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { downloadBlob } from '../../utils/fileDownload';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import RHFTextField from '../../components/RHFTextField';
import ConfirmDialog from '../../components/ConfirmDialog';
import BulkDeleteActions from '../../components/BulkDeleteActions';
import useBulkDelete from '../../hooks/useBulkDelete';
import { emptyPresetProps } from '../../utils/emptyStatePresets';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import { formatDisplayText } from '../../utils/displayText';
import ExpenseKpiGrid from './expenses/components/ExpenseKpiGrid';
import ExpenseCharts from './expenses/components/ExpenseCharts';
import ExpenseSummaryPanel, { ExpenseFinancialImpact, TopCategoriesPanel } from './expenses/components/ExpenseSummaryPanel';
import ExpenseFilterBar, { PAYMENT_METHODS, STATUSES, emptyFilters } from './expenses/components/ExpenseFilterBar';
import ExpenseImportDialog from './expenses/components/ExpenseImportDialog';

const empty = {
  ...emptyPresetProps('expenses'),
  emptyMessage: 'Track business expenses to understand profitability and control costs.',
};

const statusColor = { pending: 'warning', paid: 'success', approved: 'info', cancelled: 'default' };

export default function ExpensesPage() {
  const { formatMoney, moneyLabel } = useBusinessCurrency();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [viewExpense, setViewExpense] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const { register, handleSubmit, reset } = useForm();

  const filterParams = Object.fromEntries(
    Object.entries(appliedFilters).filter(([, v]) => v !== '' && v != null)
  );

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['expenses-dashboard', filterParams],
    queryFn: () => api.get('/expenses/dashboard', { params: filterParams }).then((r) => r.data.data),
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['expenses', filterParams],
    queryFn: () => api.get('/expenses', { params: { ...filterParams, limit: 100 } }).then((r) => r.data),
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers', { params: { limit: 100 } }).then((r) => r.data.data),
  });

  const categories = dashboard?.categories || ['Rent', 'Utilities', 'Salaries', 'Marketing', 'Supplies', 'Maintenance', 'Transportation', 'Other'];
  const rows = listData?.data || [];
  const hasExpenses = (dashboard?.summary?.count ?? rows.length) > 0;

  const openForm = (expense = null) => {
    setEditing(expense);
    reset(expense ? {
      ...expense,
      expense_date: expense.expense_date?.slice?.(0, 10) || expense.expense_date,
    } : {
      title: '',
      amount: '',
      category: 'Other',
      expense_date: new Date().toISOString().slice(0, 10),
      notes: '',
      supplier_id: '',
      supplier_name: '',
      payment_method: 'cash',
      status: 'paid',
      receipt_url: '',
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => (editing
      ? api.put(`/expenses/${editing.id}`, payload)
      : api.post('/expenses', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      queryClient.invalidateQueries(['expenses-dashboard']);
      setOpen(false);
      setEditing(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      queryClient.invalidateQueries(['expenses-dashboard']);
      setDeleteId(null);
    },
  });

  const bulkDelete = useBulkDelete({ endpoint: '/expenses', queryKey: ['expenses'] });

  const handleExport = async () => {
    const res = await api.get('/expenses/export', { params: filterParams, responseType: 'blob' });
    downloadBlob(res.data, 'expenses.csv');
  };

  const columns = [
    { field: 'expense_date', label: 'Date', render: (r) => r.expense_date ? new Date(r.expense_date).toLocaleDateString() : '—' },
    { field: 'expense_number', label: 'Expense #', render: (r) => r.expense_number || '—' },
    { field: 'category', label: 'Category' },
    { field: 'supplier_display', label: 'Supplier', render: (r) => r.supplier_display || r.supplier_name || '—' },
    { field: 'title', label: 'Description' },
    { field: 'amount', label: 'Amount', align: 'right', render: (r) => formatMoney(r.amount) },
    { field: 'payment_method', label: 'Payment', render: (r) => formatDisplayText(r.payment_method) },
    { field: 'status', label: 'Status', render: (r) => <Chip label={formatDisplayText(r.status)} size="small" color={statusColor[r.status] || 'default'} /> },
    { field: 'created_by_name', label: 'Created By', render: (r) => r.created_by_name?.trim() || '—' },
    {
      field: 'actions', label: 'Actions',
      render: (r) => (
        <>
          <Tooltip title="View"><IconButton size="small" onClick={(e) => { e.stopPropagation(); setViewExpense(r); }}><Visibility fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Edit"><IconButton size="small" onClick={(e) => { e.stopPropagation(); openForm(r); }}><Edit fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}><Delete fontSize="small" /></IconButton></Tooltip>
          {r.receipt_url && (
            <Tooltip title="Receipt"><IconButton size="small" component="a" href={r.receipt_url} target="_blank" rel="noopener noreferrer"><Download fontSize="small" /></IconButton></Tooltip>
          )}
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Expenses"
        subtitle="Financial dashboard — track spending, categories, and profit impact"
        secondaryAction={{
          label: 'Import',
          icon: <UploadFile />,
          onClick: () => setImportOpen(true),
        }}
        actionLabel="Add Expense"
        actionIcon={<Add />}
        onAction={() => openForm()}
      />

      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap' }} useFlexGap>
        <Button variant="outlined" startIcon={<FileDownload />} onClick={handleExport}>Export Report</Button>
        <Button variant="outlined" startIcon={<Category />} disabled>Expense Categories</Button>
      </Stack>

      {dashLoading ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((i) => <Grid item xs={12} sm={6} md={3} key={i}><Skeleton variant="rounded" height={110} /></Grid>)}
        </Grid>
      ) : (
        <ExpenseKpiGrid kpis={dashboard?.kpis} formatMoney={formatMoney} />
      )}

      <ExpenseFilterBar
        categories={categories}
        filters={filters}
        onChange={setFilters}
        onApply={(f) => { setFilters(f); setAppliedFilters(f); }}
        onReset={() => { setFilters(emptyFilters); setAppliedFilters(emptyFilters); }}
      />

      {hasExpenses && !dashLoading && (
        <>
          <ExpenseCharts
            monthlyTrend={dashboard?.monthlyTrend}
            categoryBreakdown={dashboard?.categoryBreakdown}
            formatMoney={formatMoney}
          />

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <ExpenseSummaryPanel summary={dashboard?.summary} pending={dashboard?.pending} formatMoney={formatMoney} />
            </Grid>
            <Grid item xs={12} md={4}>
              <ExpenseFinancialImpact financial={dashboard?.financialImpact} formatMoney={formatMoney} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TopCategoriesPanel categories={dashboard?.categoryBreakdown} formatMoney={formatMoney} />
            </Grid>
          </Grid>
        </>
      )}

      <BulkDeleteActions {...bulkDelete} title="Delete Expenses" onConfirm={bulkDelete.bulkDelete} isDeleting={bulkDelete.isDeleting} />

      <DataTable
        columns={columns}
        rows={rows}
        loading={listLoading}
        onEmptyAction={() => openForm()}
        emptyActionLabel="Add First Expense"
        {...empty}
        {...bulkDelete.selectionProps}
      />

      <FormDialog
        open={open}
        title={editing ? 'Edit Expense' : 'Add Expense'}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={handleSubmit((d) => saveMutation.mutate({
          ...d,
          amount: parseFloat(d.amount),
          supplier_id: d.supplier_id || null,
        }))}
        loading={saveMutation.isPending}
        submitLabel={editing ? 'Update' : 'Add'}
      >
        <Grid item xs={12}><RHFTextField register={register} name="title" rules={{ required: true }} label="Description" /></Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth select label="Category" defaultValue="Other" {...register('category')}>
            {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}><RHFTextField register={register} name="amount" rules={{ required: true }} label={moneyLabel('Amount')} type="number" inputProps={{ step: 0.01 }} /></Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth select label="Supplier" defaultValue="" {...register('supplier_id')}>
            <MenuItem value="">None</MenuItem>
            {(suppliers || []).map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth select label="Payment method" defaultValue="cash" {...register('payment_method')}>
            {PAYMENT_METHODS.map((m) => <MenuItem key={m} value={m}>{formatDisplayText(m)}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth select label="Status" defaultValue="paid" {...register('status')}>
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{formatDisplayText(s)}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}><RHFTextField register={register} name="expense_date" rules={{ required: true }} label="Date" type="date" InputLabelProps={{ shrink: true }} /></Grid>
        <Grid item xs={12}><RHFTextField register={register} name="receipt_url" label="Receipt URL (optional)" /></Grid>
        <Grid item xs={12}><TextField fullWidth label="Notes" multiline rows={2} {...register('notes')} /></Grid>
      </FormDialog>

      <Dialog open={!!viewExpense} onClose={() => setViewExpense(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Expense {viewExpense?.expense_number}</DialogTitle>
        <DialogContent>
          {viewExpense && (
            <Stack spacing={1} sx={{ pt: 1 }}>
              <Typography><strong>Description:</strong> {viewExpense.title}</Typography>
              <Typography><strong>Amount:</strong> {formatMoney(viewExpense.amount)}</Typography>
              <Typography><strong>Category:</strong> {viewExpense.category}</Typography>
              <Typography><strong>Date:</strong> {viewExpense.expense_date}</Typography>
              <Typography><strong>Supplier:</strong> {viewExpense.supplier_display || '—'}</Typography>
              <Typography><strong>Payment:</strong> {formatDisplayText(viewExpense.payment_method)}</Typography>
              <Typography><strong>Status:</strong> {formatDisplayText(viewExpense.status)}</Typography>
              {viewExpense.notes && <Typography><strong>Notes:</strong> {viewExpense.notes}</Typography>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewExpense(null)}>Close</Button>
          {viewExpense && <Button onClick={() => { openForm(viewExpense); setViewExpense(null); }}>Edit</Button>}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Expense"
        message="Are you sure you want to delete this expense?"
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
        danger
        confirmLabel="Delete"
      />

      <ExpenseImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries(['expenses']);
          queryClient.invalidateQueries(['expenses-dashboard']);
        }}
      />
    </Box>
  );
}
