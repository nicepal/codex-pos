import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Rating, Stack, Divider, TextField, Button, Chip, Alert, LinearProgress,
  Collapse,
} from '@mui/material';
import api from '../../services/api';
import { SF } from './storefrontTheme';

export default function ProductReviews({ productSlug, compactEmpty = false }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ author_name: '', rating: 5, title: '', body: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [writeOpen, setWriteOpen] = useState(false);

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
  const empty = !isLoading && reviews.length === 0;

  const submit = () => {
    if (!form.author_name.trim()) { setError('Please enter your name'); return; }
    submitMutation.mutate(form);
  };

  if (compactEmpty && empty) {
    return (
      <Box
        sx={{
          pt: 3,
          borderTop: '1px solid',
          borderColor: SF.colors.border,
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Box>
            <Typography fontWeight={700} sx={{ fontSize: 16 }}>Reviews</Typography>
            <Typography color="text.secondary" sx={{ fontSize: 13.5, mt: 0.25 }}>
              No reviews yet for this item.
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setWriteOpen((v) => !v)}
            sx={{ alignSelf: { xs: 'stretch', sm: 'center' }, fontWeight: 650 }}
          >
            {writeOpen ? 'Cancel' : 'Write a review'}
          </Button>
        </Stack>
        <Collapse in={writeOpen}>
          <Box sx={{ mt: 2, maxWidth: 480 }}>
            {submitted && <Alert severity="success" sx={{ mb: 2 }}>Thanks! Your review will appear once approved.</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Stack spacing={1.5}>
              <Rating value={form.rating} onChange={(_, v) => setForm((f) => ({ ...f, rating: v || 1 }))} />
              <TextField
                label="Your name"
                size="small"
                value={form.author_name}
                onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))}
              />
              <TextField
                label="Title (optional)"
                size="small"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
              <TextField
                label="Your review"
                size="small"
                multiline
                rows={3}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
              <Button
                variant="contained"
                onClick={submit}
                disabled={submitMutation.isPending}
                sx={{ alignSelf: 'flex-start' }}
              >
                Submit review
              </Button>
            </Stack>
          </Box>
        </Collapse>
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 3, borderTop: '1px solid', borderColor: SF.colors.border }}>
      <Typography fontWeight={750} sx={{ fontSize: 16, mb: 2 }}>Customer reviews</Typography>

      {!empty && (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Typography fontWeight={800} sx={{ fontSize: 36, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {summary.average?.toFixed(1) || '0.0'}
          </Typography>
          <Box>
            <Rating value={summary.average || 0} precision={0.1} readOnly />
            <Typography variant="body2" color="text.secondary">
              {summary.count} review{summary.count === 1 ? '' : 's'}
            </Typography>
          </Box>
        </Stack>
      )}

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      <Stack spacing={2} sx={{ mb: 3 }}>
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
          <Typography color="text.secondary" sx={{ fontSize: 14 }}>
            No reviews yet. Be the first to review this product.
          </Typography>
        )}
      </Stack>

      <Box sx={{ maxWidth: 520 }}>
        <Typography fontWeight={700} sx={{ mb: 1.5, fontSize: 15 }}>Write a review</Typography>
        {submitted && <Alert severity="success" sx={{ mb: 2 }}>Thanks! Your review will appear once approved.</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={1.5}>
          <Rating value={form.rating} onChange={(_, v) => setForm((f) => ({ ...f, rating: v || 1 }))} />
          <TextField
            label="Your name"
            size="small"
            value={form.author_name}
            onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))}
          />
          <TextField
            label="Title (optional)"
            size="small"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <TextField
            label="Your review"
            size="small"
            multiline
            rows={3}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          />
          <Button
            variant="contained"
            onClick={submit}
            disabled={submitMutation.isPending}
            sx={{ alignSelf: 'flex-start' }}
          >
            Submit review
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
