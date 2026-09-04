import { useOutletContext, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Typography, Button, Alert, Stack, Divider, Chip, Paper,
} from '@mui/material';
import storefrontApi from '../../services/storefrontApi';
import { useStorefrontCustomer } from '../../hooks/useStorefrontCustomer';
import StorefrontAuthPanel from '../../components/storefront/StorefrontAuthPanel';
import useStoreCurrency from '../../hooks/useStoreCurrency';

export default function StoreAccount() {
  const { basePath, storeName } = useOutletContext();
  const { formatMoney } = useStoreCurrency();
  const { isLoggedIn, isLoading, customer, displayName, logout } = useStorefrontCustomer();

  const { data: orders } = useQuery({
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
      <Stack spacing={1} sx={{ mb: 4 }}>
        {(orders || []).map((o) => (
          <Card key={o.id} variant="outlined">
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
              <Box>
                <Typography fontWeight={600}>{o.order_number}</Typography>
                <Typography variant="caption" color="text.secondary">{new Date(o.created_at).toLocaleString()}</Typography>
              </Box>
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip size="small" label={o.status} />
                <Typography fontWeight={700}>{formatMoney(o.total_amount)}</Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
        {orders && orders.length === 0 && (
          <Alert severity="info">
            No orders yet.{' '}
            <Box component={Link} to={`${basePath}/shop`} sx={{ fontWeight: 600 }}>
              Continue shopping
            </Box>
          </Alert>
        )}
      </Stack>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h6" fontWeight={700} gutterBottom>Wishlist</Typography>
      <Stack spacing={1}>
        {(wishlist || []).map((w) => (
          <Box key={w.id} component={Link} to={`${basePath}/product/${w.slug}`} sx={{ textDecoration: 'none', color: 'inherit' }}>
            <Card variant="outlined">
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5 }}>
                <Typography>{w.name}</Typography>
                <Typography fontWeight={700}>{formatMoney(w.sale_price)}</Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
        {wishlist && wishlist.length === 0 && (
          <Typography color="text.secondary">Your wishlist is empty.</Typography>
        )}
      </Stack>
    </Box>
  );
}
