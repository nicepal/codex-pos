import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Typography, Grid, TextField, MenuItem, FormControlLabel,
  Switch, Button, Alert, CircularProgress, Stack, Divider,
} from '@mui/material';
import { Save, Send } from '@mui/icons-material';
import api from '../../../services/api';
import PageHeader from '../../../components/PageHeader';
import TestConnectionDialog from './components/TestConnectionDialog';

const ENCRYPTION_OPTIONS = [
  { value: 'tls', label: 'TLS (recommended, port 587)' },
  { value: 'ssl', label: 'SSL (port 465)' },
  { value: 'none', label: 'None' },
];

const EMPTY = {
  host: '', port: 587, username: '', password: '', encryption: 'tls',
  from_email: '', from_name: '', reply_to_email: '', is_enabled: false,
};

export default function SmtpSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(false);
  const [testOpen, setTestOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-smtp'],
    queryFn: () => api.get('/admin/email/smtp').then((r) => r.data.data),
  });

  useEffect(() => {
    if (data) {
      setForm({
        host: data.host || '',
        port: data.port || 587,
        username: data.username || '',
        password: data.password || '',
        encryption: data.encryption || 'tls',
        from_email: data.from_email || '',
        from_name: data.from_name || '',
        reply_to_email: data.reply_to_email || '',
        is_enabled: !!data.is_enabled,
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload) => api.put('/admin/email/smtp', payload),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['admin-smtp'] });
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const setField = (key) => (e) => {
    const value = key === 'is_enabled' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSave = () => {
    setSaved(false);
    // Don't send the masked placeholder back as a new password
    const payload = { ...form, port: Number(form.port) };
    if (payload.password === '************') delete payload.password;
    saveMutation.mutate(payload);
  };

  const saveError = saveMutation.isError
    ? (saveMutation.error?.response?.data?.message || 'Failed to save SMTP settings')
    : null;

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <PageHeader
        title="SMTP Configuration"
        subtitle="Configure the global SMTP server used for all platform emails"
        action={(
          <Button variant="outlined" startIcon={<Send />} onClick={() => setTestOpen(true)}>
            Test Connection
          </Button>
        )}
      />

      {data?.source === 'env' && !data?.is_enabled && (
        <Alert severity="info" sx={{ mb: 2 }}>
          SMTP is currently using environment-variable defaults. Save a configuration below and enable it to manage SMTP from here.
        </Alert>
      )}
      {saved && <Alert severity="success" sx={{ mb: 2 }}>SMTP settings saved.</Alert>}
      {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <TextField fullWidth label="SMTP Host" placeholder="smtp.gmail.com" value={form.host} onChange={setField('host')} required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" label="SMTP Port" placeholder="587" value={form.port} onChange={setField('port')} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="SMTP Username" placeholder="noreply@domain.com" value={form.username} onChange={setField('username')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="password"
                label="SMTP Password"
                placeholder="********"
                value={form.password}
                onChange={setField('password')}
                helperText="Leave as-is to keep the current password"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Encryption" value={form.encryption} onChange={setField('encryption')}>
                {ENCRYPTION_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            </Grid>

            <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="From Email" placeholder="noreply@domain.com" value={form.from_email} onChange={setField('from_email')} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="From Name" placeholder="POSHive" value={form.from_name} onChange={setField('from_name')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Reply-To Email" placeholder="support@domain.com" value={form.reply_to_email} onChange={setField('reply_to_email')} />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={form.is_enabled} onChange={setField('is_enabled')} />}
                label="Enable SMTP (use these settings for all platform emails)"
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={saveMutation.isPending || !form.host || !form.from_email}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save settings'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <TestConnectionDialog
        open={testOpen}
        onClose={() => setTestOpen(false)}
        currentConfig={form}
      />
    </Box>
  );
}
