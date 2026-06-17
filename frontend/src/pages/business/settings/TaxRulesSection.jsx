import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, CardContent, Typography, Button, TextField, Stack, IconButton,
  MenuItem, FormControlLabel, Switch, Alert, Chip,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import api from '../../../services/api';
import { formatDisplayText } from '../../../utils/displayText';

const emptyForm = {
  name: '', rate: 0, category_id: '', is_inclusive: false, is_default: false,
};

export default function TaxRulesSection({ enabled }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const { data: rules } = useQuery({
    queryKey: ['tax-rules'],
    queryFn: () => api.get('/tax-rules').then((r) => r.data.data),
    enabled,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => api.get('/categories', { params: { limit: 200 } }).then((r) => r.data.data),
    enabled,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/tax-rules', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['tax-rules']);
      setForm(emptyForm);
      setError('');
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to save tax rule'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/tax-rules/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['tax-rules']),
  });

  if (!enabled) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Tax Rules</Typography>
          <Alert severity="info">Enable Advanced Tax in Feature Packs to manage tax rules.</Alert>
        </CardContent>
      </Card>
    );
  }

  const save = () => {
    if (!form.name.trim()) {
      setError('Rule name is required');
      return;
    }
    createMutation.mutate({
      name: form.name.trim(),
      rate: parseFloat(form.rate) || 0,
      category_id: form.category_id || null,
      is_inclusive: form.is_inclusive,
      is_default: form.is_default,
    });
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Tax Rules</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Define rates by category or set a default rule. Product-specific rules can be assigned on each product.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <Stack spacing={2} sx={{ mb: 3 }}>
          {(rules || []).map((rule) => (
            <Stack key={rule.id} direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <Typography fontWeight={600}>{rule.name}</Typography>
              <Chip label={`${rule.rate}%`} size="small" />
              {rule.category_name && <Chip label={rule.category_name} size="small" variant="outlined" />}
              {rule.is_default && <Chip label="Default" size="small" color="primary" />}
              {rule.is_inclusive && <Chip label="Inclusive" size="small" color="info" />}
              <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(rule.id)}>
                <Delete fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          {!rules?.length && (
            <Typography variant="body2" color="text.secondary">No tax rules yet. Add one below.</Typography>
          )}
        </Stack>

        <Typography variant="subtitle2" gutterBottom>Add rule</Typography>
        <Stack spacing={2}>
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Rate (%)" type="number" inputProps={{ step: 0.01, min: 0 }}
            value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
          <TextField select label="Category (optional)" value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <MenuItem value="">All / default scope</MenuItem>
            {(categories || []).map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <FormControlLabel
            control={<Switch checked={form.is_inclusive} onChange={(e) => setForm({ ...form, is_inclusive: e.target.checked })} />}
            label="Prices are tax-inclusive"
          />
          <FormControlLabel
            control={<Switch checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />}
            label="Default rule for products without a category rule"
          />
          <Button variant="contained" startIcon={<Add />} onClick={save} disabled={createMutation.isPending}>
            Add tax rule
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
