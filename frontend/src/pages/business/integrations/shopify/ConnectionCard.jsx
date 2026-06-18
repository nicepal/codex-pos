import { useState } from 'react';
import {
  Card, CardContent, Typography, Button, Chip, Stack, TextField, Box, Alert, Link,
} from '@mui/material';
import { Link as LinkIcon, LinkOff, CheckCircle } from '@mui/icons-material';

export default function ConnectionCard({ status, onConnect, onDisconnect, connecting, disconnecting, connectError }) {
  const connected = status?.connected;
  const [shopUrl, setShopUrl] = useState('');
  const [token, setToken] = useState('');

  const submit = (e) => {
    e.preventDefault();
    onConnect({ shop_url: shopUrl.trim(), access_token: token.trim() });
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Store connection</Typography>
          <Chip
            size="small"
            icon={connected ? <CheckCircle /> : undefined}
            label={connected ? 'Connected' : 'Not connected'}
            color={connected ? 'success' : 'default'}
          />
        </Stack>

        {connected ? (
          <Box>
            <Typography variant="body2" color="text.secondary">Store</Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              {status.store_name ? `${status.store_name} · ` : ''}{status.shop_url}
            </Typography>
            <Typography variant="body2" color="text.secondary">Access token</Typography>
            <Typography variant="body1" sx={{ mb: 1, fontFamily: 'monospace' }}>{status.access_token_masked || '••••'}</Typography>
            {status.last_sync_at && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Last sync: {new Date(status.last_sync_at).toLocaleString()}
              </Typography>
            )}
            <Button
              color="error"
              variant="outlined"
              startIcon={<LinkOff />}
              disabled={disconnecting}
              onClick={onDisconnect}
            >
              Disconnect store
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={submit}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create a Shopify custom app, grant it the <code>read_products</code> and <code>read_inventory</code> scopes,
              then paste the store URL and Admin API access token below.{' '}
              <Link href="https://help.shopify.com/en/manual/apps/app-types/custom-apps" target="_blank" rel="noopener">
                How to get a token
              </Link>
            </Typography>
            {connectError && <Alert severity="error" sx={{ mb: 2 }}>{connectError}</Alert>}
            <TextField
              fullWidth
              label="Store URL"
              placeholder="your-store.myshopify.com"
              value={shopUrl}
              onChange={(e) => setShopUrl(e.target.value)}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Admin API access token"
              placeholder="shpat_..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              type="password"
              sx={{ mb: 2 }}
              required
            />
            <Button
              type="submit"
              variant="contained"
              startIcon={<LinkIcon />}
              disabled={connecting || !shopUrl.trim() || !token.trim()}
            >
              {connecting ? 'Connecting…' : 'Connect store'}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
