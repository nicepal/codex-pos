import { useState, useEffect } from 'react';
import { useOutletContext, Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Typography, Button, Alert, Stack, Divider, Chip, Paper,
  TextField, Rating, Collapse, IconButton,
} from '@mui/material';
import { ExpandMore, ExpandLess, StarOutline } from '@mui/icons-material';
import storefrontApi from '../../services/storefrontApi';
import { useStorefrontCustomer } from '../../hooks/useStorefrontCustomer';
import StorefrontAuthPanel from '../../components/storefront/StorefrontAuthPanel';
import useStoreCurrency from '../../hooks/useStoreCurrency';
import { resolveStoreReturnPath } from '../../utils/storefrontAuthRedirect';
import { formatDisplayText } from '../../utils/displayText';
import ProductNameLink from '../../components/storefront/ProductNameLink';

function ReviewComposer({ product, onDone }) {
  const queryClient = useQueryClient();
  const { displayName } = useStorefrontCustomer();
  const [form, setForm] = useState({
    author_name: displayName || '',
    rating: 5,
    title: '',
    body: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (displayName) setForm((f) => (f.author_name ? f : { ...f, author_name: displayName }));
  }, [displayName]);

  const mutation = useMutation({
    mutationFn: (payload) => storefrontApi.post(`/storefront/products/${product.product_slug}/reviews`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['storefront-reviews', product.product_slug] });
      onDone?.();
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not submit review'),
  });

  return (
    <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
      <Typography fontWeight={700} sx={{ mb: 1, fontSize: 14 }}>
        Review {product.product_name}
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      <Stack spacing={1.25}>
        <Rating value={form.rating} onChange={(_, v) => setForm((f) => ({ ...f, rating: v || 1 }))} />
        <TextField
          size="small"
          label="Display name"
          value={form.author_name}
          onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))}
        />
        <TextField
          size="small"
          label="Title (optional)"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <TextField
          size="small"
          label="Your review"
          multiline
          rows={3}
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
        />
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="contained"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(form)}
          >
            Submit review
          </Button>
          <Button size="small" onClick={onDone}>Cancel</Button>
        </Stack>
      </Stack>
    </Box>
  );
}

function OrderCard({ order, basePath, formatMoney }) {
  const [open, setOpen] = useState(false);
  const [reviewingSlug, setReviewingSlug] = useState(null);
  const [notice, setNotice] = useState('');

  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ cursor: 'pointer' }}
          onClick={() => setOpen((v) => !v)}
        >
          <Box>
            <Typography fontWeight={600}>{order.order_number}</Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(order.created_at).toLocaleString()}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip size="small" label={formatDisplayText(order.status)} />
            <Typography fontWeight={700}>{formatMoney(order.total_amount)}</Typography>
            <IconButton size="small" aria-label="Toggle order details">
              {open ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Stack>
        </Stack>

        <Collapse in={open}>
          <Divider sx={{ my: 1.5 }} />
          {notice && <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setNotice('')}>{notice}</Alert>}
          <Stack spacing={1.25}>
            {(order.items || []).map((item) => (
              <Box key={`${order.id}-${item.product_id || item.product_name}`}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                  <Box>
                    <ProductNameLink
                      slug={item.product_slug}
                      name={item.product_name}
                      basePath={basePath}
                      fontWeight={600}
                      sx={{ display: 'block' }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Qty {item.quantity} · {formatMoney(item.total)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {item.already_reviewed && <Chip size="small" label="Reviewed" color="success" variant="outlined" />}
                    {item.can_review && (
                      <Button
                        size="small"
                        startIcon={<StarOutline />}
                        variant={reviewingSlug === item.product_slug ? 'outlined' : 'contained'}
                        onClick={() => setReviewingSlug(
                          reviewingSlug === item.product_slug ? null : item.product_slug
                        )}
                      >
                        Write review
                      </Button>
                    )}
                  </Stack>
                </Stack>
                {reviewingSlug === item.product_slug && (
                  <ReviewComposer
                    product={item}
                    onDone={() => {
                      setReviewingSlug(null);
                      setNotice('Thanks! Your review was submitted for approval.');
                    }}
                  />
                )}
              </Box>
            ))}
            {(!order.items || order.items.length === 0) && (
              <Typography color="text.secondary" variant="body2">No line items</Typography>
            )}
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
}

export default function StoreAccount() {
  const { basePath, storeName } = useOutletContext();
  const { formatMoney } = useStoreCurrency();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isLoggedIn, isLoading, customer, displayName, logout } = useStorefrontCustomer();

  const returnTarget = resolveStoreReturnPath(
    basePath,
    searchParams.get('return') || location.state?.from,
    `${basePath}/shop`
  );

  const afterAuth = () => {
    navigate(returnTarget, { replace: true });
  };

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['storefront-my-orders'],
    queryFn: () => storefrontApi.get('/storefront/account/orders').then((r) => r.data.data),
    enabled: isLoggedIn,
  });

  const { data: wishlist } = useQuery({
    queryKey: ['storefront-wishlist'],
    queryFn: () => storefrontApi.get('/storefront/account/wishlist').then((r) => r.data.data),
    enabled: isLoggedIn,
  });

  if (isLoading) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">Loading your account…</Typography>
      </Box>
    );
  }

  if (!isLoggedIn) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography variant="h5" fontWeight={800} textAlign="center" gutterBottom>
          {storeName ? `Sign in to ${storeName}` : 'My Account'}
        </Typography>
        <Typography color="text.secondary" textAlign="center" sx={{ mb: 3, fontSize: 14 }}>
          Track orders, save favorites, and leave product reviews
        </Typography>
        <StorefrontAuthPanel
          title={null}
          subtitle={null}
          onAuthed={afterAuth}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ py: 2 }}>
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ sm: 'center' }}>
          <Box>
            <Typography variant="overline" color="text.secondary">Signed in</Typography>
            <Typography variant="h5" fontWeight={800}>{displayName || 'Customer'}</Typography>
            <Typography color="text.secondary">{customer?.email}</Typography>
            {customer?.phone && (
              <Typography variant="body2" color="text.secondary">{customer.phone}</Typography>
            )}
          </Box>
          <Button variant="outlined" onClick={logout}>Sign out</Button>
        </Stack>
      </Paper>

      <Typography variant="h6" fontWeight={700} gutterBottom>Order history</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Expand an order to review products you purchased.
      </Typography>
      <Stack spacing={1} sx={{ mb: 4 }}>
        {ordersLoading && <Typography color="text.secondary">Loading orders…</Typography>}
        {(orders || []).map((o) => (
          <OrderCard key={o.id} order={o} basePath={basePath} formatMoney={formatMoney} />
        ))}
        {!ordersLoading && orders && orders.length === 0 && (
          <Alert severity="info">
            No orders yet for this email.{' '}
            <Box component={Link} to={`${basePath}/shop`} sx={{ fontWeight: 600 }}>
              Continue shopping
            </Box>
            {' '}Use the same email at checkout so orders show up here.
          </Alert>
        )}
      </Stack>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h6" fontWeight={700} gutterBottom>Wishlist</Typography>
      <Stack spacing={1}>
        {(wishlist || []).map((w) => (
          <Card key={w.id} variant="outlined">
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5 }}>
              <ProductNameLink slug={w.slug} name={w.name} basePath={basePath} fontWeight={600} />
              <Typography fontWeight={700}>{formatMoney(w.sale_price)}</Typography>
            </CardContent>
          </Card>
        ))}
        {wishlist && wishlist.length === 0 && (
          <Typography color="text.secondary">Your wishlist is empty.</Typography>
        )}
      </Stack>
    </Box>
  );
}
