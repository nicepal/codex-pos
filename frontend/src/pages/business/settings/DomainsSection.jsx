import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, CardContent, Typography, Button, TextField, Stack, IconButton, Alert, Chip, Box,
} from '@mui/material';
import { Add, Delete, VerifiedUser } from '@mui/icons-material';
import api from '../../../services/api';
import { formatDisplayText } from '../../../utils/displayText';

export default function DomainsSection({ enabled, storeSlug }) {
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState('');
  const [error, setError] = useState('');

  const { data: domains } = useQuery({
    queryKey: ['domains'],
    queryFn: () => api.get('/domains').then((r) => r.data.data),
    enabled,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/domains', payload),
    onSuccess: () => {
      setDomain('');
      setError('');
      queryClient.invalidateQueries(['domains']);
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to add domain'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/domains/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['domains']),
  });

  const verifyMutation = useMutation({
    mutationFn: (id) => api.post(`/domains/${id}/verify`),
    onSuccess: () => queryClient.invalidateQueries(['domains']),
    onError: (err) => setError(err.response?.data?.message || 'Verification failed'),
  });

  if (!enabled) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Custom Domains</Typography>
          <Alert severity="info">Enable Omnichannel in Feature Packs to manage custom domains.</Alert>
        </CardContent>
      </Card>
    );
  }

  const statusColor = (status) => {
    if (status === 'verified') return 'success';
    if (status === 'failed') return 'error';
    return 'warning';
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Domains</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Your default shop URL is <strong>{storeSlug}.eyz.com</strong>. Add a custom domain and point DNS to your server.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <Stack spacing={2} sx={{ mb: 3 }}>
          {(domains || []).map((d) => (
            <Box key={d.id} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                <Typography fontWeight={600}>{d.domain}</Typography>
                <Chip label={formatDisplayText(d.domain_type)} size="small" variant="outlined" />
                <Chip label={formatDisplayText(d.verification_status)} size="small" color={statusColor(d.verification_status)} />
                {d.domain_type === 'custom' && d.verification_status === 'pending' && (
                  <Button size="small" startIcon={<VerifiedUser />}
                    onClick={() => verifyMutation.mutate(d.id)} disabled={verifyMutation.isPending}>
                    Mark verified
                  </Button>
                )}
                {d.domain_type === 'custom' && (
                  <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(d.id)}>
                    <Delete fontSize="small" />
                  </IconButton>
                )}
              </Stack>
              {d.domain_type === 'custom' && d.verification_token && d.verification_status === 'pending' && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Add a TXT record: <code>eyz-verify={d.verification_token}</code> then click Mark verified.
                </Typography>
              )}
            </Box>
          ))}
        </Stack>

        <Typography variant="subtitle2" gutterBottom>Add custom domain</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField fullWidth label="Domain" placeholder="shop.yourdomain.com"
            value={domain} onChange={(e) => setDomain(e.target.value)} />
          <Button variant="contained" startIcon={<Add />} disabled={!domain.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate({ domain: domain.trim() })}>
            Add domain
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
