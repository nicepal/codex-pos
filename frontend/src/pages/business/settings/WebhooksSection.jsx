import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, CardContent, Typography, Button, TextField, Stack, IconButton, Alert, Chip,
} from '@mui/material';
import { Add, Delete, ContentCopy } from '@mui/icons-material';
import api from '../../../services/api';
import { formatDisplayText } from '../../../utils/displayText';

export default function WebhooksSection({ enabled }) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [lastSecret, setLastSecret] = useState('');
  const [error, setError] = useState('');

  const { data: webhooks } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => api.get('/webhooks').then((r) => r.data.data),
    enabled,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/webhooks', payload),
    onSuccess: (res) => {
      setLastSecret(res.data.data?.secret || '');
      setUrl('');
      setError('');
      queryClient.invalidateQueries(['webhooks']);
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to create webhook'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/webhooks/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['webhooks']),
  });

  const copySecret = () => {
    if (lastSecret) navigator.clipboard?.writeText(lastSecret);
  };

  if (!enabled) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Webhooks</Typography>
          <Alert severity="info">Enable Omnichannel in Feature Packs to configure webhooks.</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Webhooks</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Receive signed HTTP callbacks when orders are created. Verify using the HMAC-SHA256 signature header.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {lastSecret && (
          <Alert severity="success" sx={{ mb: 2 }} action={(
            <Button color="inherit" size="small" startIcon={<ContentCopy />} onClick={copySecret}>Copy secret</Button>
          )}>
            Webhook created. Save this secret now — it won&apos;t be shown again: <strong>{lastSecret}</strong>
          </Alert>
        )}

        <Stack spacing={1} sx={{ mb: 3 }}>
          {(webhooks || []).map((hook) => (
            <Stack key={hook.id} direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <Typography sx={{ wordBreak: 'break-all', flex: 1 }}>{hook.url}</Typography>
              <Chip label={formatDisplayText(hook.status)} size="small" color={hook.status === 'active' ? 'success' : 'default'} />
              <Chip label="order.created" size="small" variant="outlined" />
              <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(hook.id)}>
                <Delete fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          {!webhooks?.length && (
            <Typography variant="body2" color="text.secondary">No webhooks configured.</Typography>
          )}
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField fullWidth label="Endpoint URL" placeholder="https://example.com/webhooks/orders"
            value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button variant="contained" startIcon={<Add />} disabled={!url.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate({ url: url.trim(), events: ['order.created'] })}>
            Add webhook
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
