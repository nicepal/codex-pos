import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Grid, TextField, MenuItem, IconButton, Box } from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import RHFTextField from '../../components/RHFTextField';
import ConfirmDialog from '../../components/ConfirmDialog';
import BulkDeleteActions from '../../components/BulkDeleteActions';
import useBulkDelete from '../../hooks/useBulkDelete';
import { emptyPresetProps } from '../../utils/emptyStatePresets';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';

const empty = emptyPresetProps('expenses');
import StatCard from '../../components/StatCard';

const CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Marketing', 'Supplies', 'Maintenance', 'Other'];

export default function ExpensesPage() {
  const { formatMoney } = useBusinessCurrency();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => api.get('/expenses', { params: { limit: 500 } }).then((r) => r.data),
  });

  const openForm = (expense = null) => {
    setEditing(expense);
    reset(expense || {
      title: '', amount: '', category: 'Other', expense_date: new Date().toISOString().slice(0, 10), notes: '',
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => (editing
      ? api.put(`/expenses/${editing.id}`, payload)
      : api.post('/expenses', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      setOpen(false);
      setEditing(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['expenses']); setDeleteId(null); },
  });

  const bulkDelete = useBulkDelete({ endpoint: '/expenses', queryKey: ['expenses'] });

  const allRows = data?.data || [];

  const filteredRows = useMemo(() => allRows.filter((e) => {
    if (categoryFilter && e.category !== categoryFilter) return false;
    if (dateFrom && e.expense_date < dateFrom) return false;
    if (dateTo && e.expense_date > dateTo) return false;
    return true;
  }), [allRows, categoryFilter, dateFrom, dateTo]);

  const totalAmount = useMemo(() => filteredRows.reduce((sum, e) => sum + Number(e.amount || 0), 0), [filteredRows]);

  const categorySummary = useMemo(() => {
    const map = {};
    filteredRows.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredRows]);

  const columns = [
    { field: 'title', label: 'Title' },
    { field: 'category', label: 'Category' },
    { field: 'amount', label: 'Amount', align: 'right', render: (r) => formatMoney(r.amount) },
    { field: 'expense_date', label: 'Date', render: (r) => r.expense_date ? new Date(r.expense_date).toLocaleDateString() : '-' },
    { field: 'notes', label: 'Notes', render: (r) => r.notes || '-' },
    {
      field: 'actions', label: 'Actions',
      render: (r) => (
        <>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); openForm(r); }}><Edit fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}><Delete fontSize="small" /></IconButton>
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Expenses" subtitle="Track business spending" actionLabel="Add Expense" actionIcon={<Add />} onAction={() => openForm()} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard title="Total (filtered)" value={formatMoney(totalAmount)} subtitle={`${filteredRows.length} records`} />
        </Grid>
        <Grid item xs={12} sm={8}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', height: '100%' }}>
            {categorySummary.slice(0, 4).map(([cat, amt]) => (
              <StatCard key={cat} title={cat} value={formatMoney(amt)} />
            ))}
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField select label="Category" size="small" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">All</MenuItem>
          {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <TextField label="From" type="date" size="small" InputLabelProps={{ shrink: true }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <TextField label="To" type="date" size="small" InputLabelProps={{ shrink: true }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </Box>

      <BulkDeleteActions
        {...bulkDelete}
        title="Delete Expenses"
        onConfirm={bulkDelete.bulkDelete}
        isDeleting={bulkDelete.isDeleting}
      />

      <DataTable columns={columns} rows={filteredRows} loading={isLoading} onEmptyAction={() => openForm()} {...empty} {...bulkDelete.selectionProps} />

      <FormDialog
        open={open}
        title={editing ? 'Edit Expense' : 'Add Expense'}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={handleSubmit((d) => saveMutation.mutate({ ...d, amount: parseFloat(d.amount) }))}
        loading={saveMutation.isPending}
        submitLabel={editing ? 'Update' : 'Add'}
      >
        <Grid item xs={12}><RHFTextField register={register} name="title" rules={{ required: true }} label="Title" /></Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth select label="Category" defaultValue="Other" {...register('category')}>
            {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}><RHFTextField register={register} name="amount" rules={{ required: true }} label="Amount" type="number" inputProps={{ step: 0.01 }} /></Grid>
        <Grid item xs={12}><RHFTextField register={register} name="expense_date" rules={{ required: true }} label="Date" type="date" InputLabelProps={{ shrink: true }} /></Grid>
        <Grid item xs={12}><TextField fullWidth label="Notes" multiline rows={2} {...register('notes')} /></Grid>
      </FormDialog>

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
    </>
  );
}
