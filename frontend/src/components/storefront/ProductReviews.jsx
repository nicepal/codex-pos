import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Rating, Stack, Divider, TextField, Button, Chip, Alert, LinearProgress,
} from '@mui/material';
import api from '../../services/api';

export default function ProductReviews({ productSlug }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ author_name: '', rating: 5, title: '', body: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['storefront-reviews', productSlug],
    queryFn: () => api.get(`/storefront/products/${productSlug}/reviews`).then((r) => r.data.data),
  });

  const submitMutation = useMutation({
    mutationFn: (payload) => api.post(`/storefront/products/${productSlug}/reviews`, payload),
    onSuccess: () => {
      setSubmitted(true);
      setError('');
      setForm({ author_name: '', rating: 5, title: '', body: '' });
      queryClient.invalidateQueries(['storefront-reviews', productSlug]);
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not submit review'),
  });

  const summary = data?.summary || { count: 0, average: 0 };
  const reviews = data?.reviews || [];

  const submit = () => {
    if (!form.author_name.trim()) { setError('Please enter your name'); return; }
    submitMutation.mutate(form);
  };

  return (
    <Box sx={{ mt: 6, pt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>Customer Reviews</Typography>

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h3" fontWeight={800}>{summary.average?.toFixed(1) || '0.0'}</Typography>
        <Box>
          <Rating value={summary.average || 0} precision={0.1} readOnly />
          <Typography variant="body2" color="text.secondary">
            {summary.count} review{summary.count === 1 ? '' : 's'}
          </Typography>
        </Box>
      </Stack>

      {isLoading && <LinearProgress />}

      <Stack spacing={2} sx={{ mb: 4 }}>
        {reviews.map((r) => (
          <Box key={r.id}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Rating value={r.rating} size="small" readOnly />
              {r.verified_purchase && <Chip size="small" label="Verified purchase" color="success" />}
            </Stack>
            {r.title && <Typography fontWeight={600} sx={{ mt: 0.5 }}>{r.title}</Typography>}
            <Typography variant="body2" color="text.secondary">{r.body}</Typography>
            <Typography variant="caption" color="text.disabled">
              {r.author_name} · {new Date(r.created_at).toLocaleDateString()}
            </Typography>
            <Divider sx={{ mt: 1.5 }} />
          </Box>
        ))}
        {!isLoading && reviews.length === 0 && (
          <Typography color="text.secondary">No reviews yet. Be the first to review this product.</Typography>
        )}
      </Stack>

      <Box sx={{ maxWidth: 520 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Write a review</Typography>
        {submitted && <Alert severity="success" sx={{ mb: 2 }}>Thanks! Your review will appear once approved.</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2}>
          <Rating value={form.rating} onChange={(_, v) => setForm((f) => ({ ...f, rating: v || 1 }))} />
          <TextField label="Your name" size="small" value={form.author_name}
            onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))} />
          <TextField label="Title (optional)" size="small" value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <TextField label="Your review" size="small" multiline rows={3} value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          <Button variant="contained" onClick={submit} disabled={submitMutation.isPending} sx={{ alignSelf: 'flex-start' }}>
            Submit review
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
