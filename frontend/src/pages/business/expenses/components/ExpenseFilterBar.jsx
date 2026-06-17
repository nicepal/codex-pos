import { useState } from 'react';
import {
  Card, CardContent, Stack, TextField, MenuItem, Button, Box,
} from '@mui/material';
import { FilterList, RestartAlt } from '@mui/icons-material';

const PAYMENT_METHODS = ['cash', 'card', 'bank', 'cheque', 'other'];
const STATUSES = ['pending', 'paid', 'approved', 'cancelled'];

const emptyFilters = {
  date_from: '',
  date_to: '',
  category: '',
  supplier: '',
  payment_method: '',
  status: '',
  q: '',
};

export default function ExpenseFilterBar({ categories, filters, onChange, onApply, onReset }) {
  const [local, setLocal] = useState(filters || emptyFilters);

  const update = (key, val) => setLocal((prev) => ({ ...prev, [key]: val }));

  const apply = () => onApply(local);
  const reset = () => {
    setLocal(emptyFilters);
    onReset();
  };

  return (
    <Card sx={{ mb: 3, boxShadow: 1 }}>
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
          <TextField label="From" type="date" size="small" InputLabelProps={{ shrink: true }}
            value={local.date_from} onChange={(e) => update('date_from', e.target.value)} />
          <TextField label="To" type="date" size="small" InputLabelProps={{ shrink: true }}
            value={local.date_to} onChange={(e) => update('date_to', e.target.value)} />
          <TextField select label="Category" size="small" sx={{ minWidth: 140 }}
            value={local.category} onChange={(e) => update('category', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {(categories || []).map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <TextField label="Supplier" size="small" value={local.supplier}
            onChange={(e) => update('supplier', e.target.value)} />
          <TextField select label="Payment" size="small" sx={{ minWidth: 120 }}
            value={local.payment_method} onChange={(e) => update('payment_method', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {PAYMENT_METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </TextField>
          <TextField select label="Status" size="small" sx={{ minWidth: 120 }}
            value={local.status} onChange={(e) => update('status', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          <TextField label="Search" size="small" value={local.q}
            onChange={(e) => update('q', e.target.value)} sx={{ minWidth: 160 }} />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button variant="contained" startIcon={<FilterList />} onClick={apply}>Apply</Button>
            <Button variant="outlined" startIcon={<RestartAlt />} onClick={reset}>Reset</Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export { PAYMENT_METHODS, STATUSES, emptyFilters };
