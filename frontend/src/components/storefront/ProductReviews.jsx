import { useState, useEffect } from 'react';
import { Link, useOutletContext, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Rating, Stack, Divider, TextField, Button, Chip, Alert, LinearProgress,
  Collapse,
} from '@mui/material';
import storefrontApi from '../../services/storefrontApi';
import { useStorefrontCustomer } from '../../hooks/useStorefrontCustomer';
import StorefrontAuthPanel from './StorefrontAuthPanel';
import { storeAccountLoginPath } from '../../utils/storefrontAuthRedirect';
import { SF } from './storefrontTheme';

function ReviewForm({ form, setForm, onSubmit, pending, submitted, error }) {
  return (
    <Stack spacing={1.5}>
      {submitted && <Alert severity="success">Thanks! Your review will appear once approved.</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <Rating value={form.rating} onChange={(_, v) => setForm((f) => ({ ...f, rating: v || 1 }))} />
      <TextField
        label="Display name"
        size="small"
        value={form.author_name}
        onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))}
        helperText="Shown with your review"
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
      <Button variant="contained" onClick={onSubmit} disabled={pending} sx={{ alignSelf: 'flex-start' }}>
        Submit review
      </Button>
    </Stack>
  );
}

export default function ProductReviews({ productSlug, compactEmpty = false }) {
  const queryClient = useQueryClient();
  const { basePath, storeName } = useOutletContext() || {};
  const location = useLocation();
  const accountLoginHref = storeAccountLoginPath(
    basePath,
    `${location.pathname}${location.search}`
  );
  const { isLoggedIn, isLoading: authLoading, displayName } = useStorefrontCustomer();
  const [form, setForm] = useState({ author_name: '', rating: 5, title: '', body: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [writeOpen, setWriteOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (isLoggedIn && displayName && !form.author_name) {
      setForm((f) => ({ ...f, author_name: displayName }));
    }
  }, [isLoggedIn, displayName, form.author_name]);

  const { data, isLoading } = useQuery({
    queryKey: ['storefront-reviews', productSlug, isLoggedIn],
    queryFn: () => storefrontApi.get(`/storefront/products/${productSlug}/reviews`).then((r) => r.data.data),
  });

  const submitMutation = useMutation({
    mutationFn: (payload) => storefrontApi.post(`/storefront/products/${productSlug}/reviews`, payload),
    onSuccess: () => {
      setSubmitted(true);
      setError('');
      setForm((f) => ({ ...f, title: '', body: '', rating: 5 }));
      queryClient.invalidateQueries(['storefront-reviews', productSlug]);
      queryClient.invalidateQueries(['storefront-my-orders']);
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not submit review'),
  });

  const summary = data?.summary || { count: 0, average: 0 };
  const reviews = data?.reviews || [];
  const empty = !isLoading && reviews.length === 0;
  const canReview = Boolean(data?.can_review);
  const hasPurchased = Boolean(data?.has_purchased);
  const alreadyReviewed = Boolean(data?.already_reviewed);

  const submit = () => {
    if (!isLoggedIn) {
      setShowAuth(true);
      setWriteOpen(true);
      setError('Please sign in to leave a review');
      return;
    }
    if (!canReview) {
      setError(alreadyReviewed
        ? 'You already reviewed this product'
        : 'Only customers who purchased this product can leave a review');
      return;
    }
    submitMutation.mutate(form);
  };

  const writeSection = (
    <Box sx={{ maxWidth: 480, mt: compactEmpty ? 2 : 0 }}>
      <Typography fontWeight={700} sx={{ mb: 1.5, fontSize: 15 }}>Write a review</Typography>
      {authLoading ? (
        <Typography color="text.secondary" sx={{ fontSize: 14 }}>Checking account…</Typography>
      ) : !isLoggedIn ? (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Sign in with the email you used at checkout. Only purchased products can be reviewed.
          </Alert>
          {(showAuth || writeOpen || !compactEmpty) && (
            <StorefrontAuthPanel
              compact
              title="Sign in to review"
              subtitle={`Use your ${storeName || 'store'} account (same email as your order)`}
              onAuthed={() => {
                setShowAuth(false);
                setError('');
                queryClient.invalidateQueries(['storefront-reviews', productSlug]);
              }}
            />
          )}
          {compactEmpty && !showAuth && !writeOpen && (
            <Button variant="contained" onClick={() => { setWriteOpen(true); setShowAuth(true); }}>
              Sign in to review
            </Button>
          )}
          {basePath && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Or go to{' '}
              <Box component={Link} to={accountLoginHref} state={{ from: `${location.pathname}${location.search}` }} sx={{ fontWeight: 600 }}>
                My Account
              </Box>
            </Typography>
          )}
        </Box>
      ) : alreadyReviewed ? (
        <Alert severity="success">You already submitted a review for this product.</Alert>
      ) : !hasPurchased ? (
        <Alert severity="info">
          Purchase this product to leave a review. After checkout, you can also review it from{' '}
          <Box component={Link} to={`${basePath}/account`} sx={{ fontWeight: 600 }}>My Account</Box>.
        </Alert>
      ) : (
        <ReviewForm
          form={form}
          setForm={setForm}
          onSubmit={submit}
          pending={submitMutation.isPending}
          submitted={submitted}
          error={error}
        />
      )}
    </Box>
  );

  if (compactEmpty && empty) {
    return (
      <Box sx={{ pt: 3, borderTop: '1px solid', borderColor: SF.colors.border }}>
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
            onClick={() => {
              setWriteOpen((v) => !v);
              if (!isLoggedIn) setShowAuth(true);
            }}
            sx={{ alignSelf: { xs: 'stretch', sm: 'center' }, fontWeight: 650 }}
          >
            {writeOpen ? 'Cancel' : (canReview ? 'Write a review' : (isLoggedIn ? 'Reviews' : 'Sign in to review'))}
          </Button>
        </Stack>
        <Collapse in={writeOpen}>{writeSection}</Collapse>
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

      {writeSection}
    </Box>
  );
}
