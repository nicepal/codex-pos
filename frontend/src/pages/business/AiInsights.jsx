import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Typography, TextField, Button, Chip, Grid, Alert, CircularProgress, Stack,
} from '@mui/material';
import { AutoAwesome, Send } from '@mui/icons-material';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';

const URGENCY_COLOR = { critical: 'error', urgent: 'warning', soon: 'info', ok: 'default' };

const SUGGESTED_QUESTIONS = [
  'How did sales go this month?',
  'What is my best selling product?',
  'Should I be worried about my expenses?',
];

export default function AiInsightsPage() {
  const { formatMoney } = useBusinessCurrency();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);

  const { data: reorder, isLoading } = useQuery({
    queryKey: ['ai-reorder'],
    queryFn: () => api.get('/ai/reorder-suggestions').then((r) => r.data.data),
  });

  const askMutation = useMutation({
    mutationFn: (q) => api.post('/ai/insights', { question: q }).then((r) => r.data.data),
    onSuccess: (data) => setAnswer(data),
  });

  const ask = (q) => {
    const text = (q || question).trim();
    if (!text) return;
    setQuestion(text);
    askMutation.mutate(text);
  };

  const columns = [
    { field: 'name', label: 'Product', render: (r) => <strong>{r.name}</strong> },
    { field: 'stock_quantity', label: 'In stock' },
    { field: 'daily_velocity', label: 'Sales/day' },
    { field: 'days_of_stock', label: 'Days left', render: (r) => (r.days_of_stock == null ? '—' : r.days_of_stock) },
    { field: 'suggested_quantity', label: 'Reorder qty', render: (r) => <strong>{r.suggested_quantity}</strong> },
    { field: 'estimated_cost', label: 'Est. cost', render: (r) => formatMoney(r.estimated_cost) },
    {
      field: 'urgency',
      label: 'Urgency',
      render: (r) => <Chip size="small" label={r.urgency} color={URGENCY_COLOR[r.urgency] || 'default'} />,
    },
  ];

  return (
    <Box>
      <PageHeader title="AI Insights" subtitle="Smart reorder suggestions and an analytics copilot for your store" />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <AutoAwesome color="primary" />
            <Typography variant="h6">Ask your data</Typography>
          </Stack>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="e.g. How did sales go this month?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') ask(); }}
            />
            <Button variant="contained" startIcon={<Send />} onClick={() => ask()} disabled={askMutation.isPending}>
              Ask
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {SUGGESTED_QUESTIONS.map((q) => (
              <Chip key={q} label={q} variant="outlined" onClick={() => ask(q)} />
            ))}
          </Box>
          {askMutation.isPending && <CircularProgress size={24} />}
          {answer && !askMutation.isPending && (
            <Alert severity="info" icon={<AutoAwesome />}>
              <Typography variant="body1">{answer.answer}</Typography>
              {answer.source === 'heuristic' && (
                <Typography variant="caption" color="text.secondary">
                  Generated from your data. Connect an AI provider for richer answers.
                </Typography>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Typography variant="h6" gutterBottom>Smart Reorder Suggestions</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Based on the last {reorder?.window_days || 30} days of sales velocity.
      </Typography>
      <DataTable
        columns={columns}
        rows={reorder?.suggestions || []}
        loading={isLoading}
        emptyTitle="Nothing to reorder"
        emptyMessage="Stock levels are healthy based on recent sales. Check back later."
      />
    </Box>
  );
}
