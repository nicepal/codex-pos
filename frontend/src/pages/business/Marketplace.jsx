import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip, Stack,
} from '@mui/material';
import { Sync, Link as LinkIcon, LinkOff } from '@mui/icons-material';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import FeatureGate from '../../components/FeatureGate';

const CHANNEL_META = {
  amazon: { label: 'Amazon', blurb: 'List products on Amazon Marketplace' },
  ebay: { label: 'eBay', blurb: 'Sell across eBay listings' },
  instagram: { label: 'Instagram Shop', blurb: 'Tag products in Instagram posts' },
  tiktok: { label: 'TikTok Shop', blurb: 'Sell through TikTok videos & live' },
  google: { label: 'Google Shopping', blurb: 'Surface products in Google search' },
};

export default function MarketplacePage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace'],
    queryFn: () => api.get('/marketplace').then((r) => r.data.data),
  });

  const connectMutation = useMutation({
    mutationFn: (channel) => api.post('/marketplace/connect', { channel, display_name: CHANNEL_META[channel]?.label }),
    onSuccess: () => queryClient.invalidateQueries(['marketplace']),
  });

  const disconnectMutation = useMutation({
    mutationFn: (channel) => api.delete(`/marketplace/${channel}`),
    onSuccess: () => queryClient.invalidateQueries(['marketplace']),
  });

  const syncMutation = useMutation({
    mutationFn: (channel) => api.post(`/marketplace/${channel}/sync`),
    onSuccess: () => queryClient.invalidateQueries(['marketplace']),
  });

  const channels = data || [];

  return (
    <FeatureGate pack="omnichannel">
      <Box>
        <PageHeader title="Sales Channels" subtitle="Connect marketplaces and social commerce to sync your catalog" />

        <Grid container spacing={2}>
          {channels.map((c) => {
            const meta = CHANNEL_META[c.channel] || { label: c.channel, blurb: '' };
            const connected = c.status === 'connected';
            return (
              <Grid item xs={12} sm={6} md={4} key={c.channel}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="h6">{meta.label}</Typography>
                      <Chip
                        size="small"
                        label={connected ? 'Connected' : 'Not connected'}
                        color={connected ? 'success' : 'default'}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                      {meta.blurb}
                    </Typography>

                    {connected && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        {c.last_sync_at
                          ? `Last sync: ${new Date(c.last_sync_at).toLocaleString()} · ${c.synced_product_count} products`
                          : 'Not synced yet'}
                      </Typography>
                    )}

                    <Stack direction="row" spacing={1}>
                      {connected ? (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Sync />}
                            disabled={syncMutation.isPending}
                            onClick={() => syncMutation.mutate(c.channel)}
                          >
                            Sync
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<LinkOff />}
                            onClick={() => disconnectMutation.mutate(c.channel)}
                          >
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<LinkIcon />}
                          disabled={connectMutation.isPending}
                          onClick={() => connectMutation.mutate(c.channel)}
                        >
                          Connect
                        </Button>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
          {!isLoading && channels.length === 0 && (
            <Grid item xs={12}><Typography color="text.secondary">No channels available.</Typography></Grid>
          )}
        </Grid>
      </Box>
    </FeatureGate>
  );
}
