import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Box, TextField, Button, Alert, Grid } from '@mui/material';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';

export default function NotificationsAdminPage() {
  const [form, setForm] = useState({ tenant_id: '', title: '', message: '', type: 'info' });
  const [success, setSuccess] = useState('');

  const send = useMutation({
    mutationFn: () => api.post('/notifications/send', form),
    onSuccess: () => { setSuccess('Notification queued'); setForm({ tenant_id: '', title: '', message: '', type: 'info' }); },
  });

  return (
    <Box>
      <PageHeader title="Send Notification" subtitle="Push a notification to a business tenant" />
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      <Grid container spacing={2} maxWidth="md">
        <Grid item xs={12}><TextField fullWidth label="Tenant ID" value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })} required /></Grid>
        <Grid item xs={12}><TextField fullWidth label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Grid>
        <Grid item xs={12}><TextField fullWidth label="Message" multiline rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required /></Grid>
        <Grid item xs={12}><Button variant="contained" onClick={() => send.mutate()} disabled={send.isPending || !form.tenant_id}>Send</Button></Grid>
      </Grid>
    </Box>
  );
}
