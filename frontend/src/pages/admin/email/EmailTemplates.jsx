import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Grid, Card, CardContent, Typography, List, ListItemButton, ListItemText,
  TextField, Button, Stack, Alert, Chip, CircularProgress, Divider,
} from '@mui/material';
import { Save, Visibility, Send } from '@mui/icons-material';
import api from '../../../services/api';
import PageHeader from '../../../components/PageHeader';
import EmailPreviewDialog from './components/EmailPreviewDialog';

const VARIABLES = [
  'business_name', 'user_name', 'customer_name', 'invoice_number', 'order_number',
  'reset_link', 'verification_link', 'subscription_name', 'expiry_date',
];

export default function EmailTemplatesPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({ name: '', subject: '', body_html: '', body_text: '' });
  const [saved, setSaved] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testMsg, setTestMsg] = useState(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['admin-email-templates'],
    queryFn: () => api.get('/admin/email/templates').then((r) => r.data.data),
  });

  useEffect(() => {
    if (templates && templates.length && !selectedId) {
      setSelectedId(templates[0].id);
    }
  }, [templates, selectedId]);

  const selected = templates?.find((t) => t.id === selectedId);
  useEffect(() => {
    if (selected) {
      setForm({
        name: selected.name || '',
        subject: selected.subject || '',
        body_html: selected.body_html || '',
        body_text: selected.body_text || '',
      });
      setSaved(false);
      setTestMsg(null);
    }
  }, [selected]);

  const saveMutation = useMutation({
    mutationFn: (payload) => api.put(`/admin/email/templates/${selectedId}`, payload),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] });
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const previewMutation = useMutation({
    mutationFn: () => api.post(`/admin/email/templates/${selectedId}/preview`, {
      subject: form.subject, body_html: form.body_html,
    }).then((r) => r.data.data),
  });

  const sendTestMutation = useMutation({
    mutationFn: () => api.post('/admin/email/send-test', { test_email: testEmail, slug: selected?.slug }).then((r) => r.data),
    onSuccess: () => setTestMsg({ type: 'success', text: 'Test email queued/sent.' }),
    onError: (err) => setTestMsg({ type: 'error', text: err.response?.data?.message || 'Failed to send test' }),
  });

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const insertVariable = (v) => {
    setForm((f) => ({ ...f, body_html: `${f.body_html}{{${v}}}` }));
  };

  const openPreview = () => {
    previewMutation.mutate();
    setPreviewOpen(true);
  };

  const saveError = saveMutation.isError ? (saveMutation.error?.response?.data?.message || 'Failed to save') : null;

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <PageHeader title="Email Templates" subtitle="Manage global email templates and preview with sample data" />

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <List dense>
                {(templates || []).map((t) => (
                  <ListItemButton key={t.id} selected={t.id === selectedId} onClick={() => setSelectedId(t.id)}>
                    <ListItemText primary={t.name} secondary={t.slug} />
                  </ListItemButton>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              {!selected ? (
                <Typography color="text.secondary">Select a template to edit.</Typography>
              ) : (
                <>
                  {saved && <Alert severity="success" sx={{ mb: 2 }}>Template saved.</Alert>}
                  {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

                  <TextField fullWidth label="Template Name" value={form.name} onChange={setField('name')} sx={{ mb: 2 }} />
                  <TextField fullWidth label="Subject" value={form.subject} onChange={setField('subject')} sx={{ mb: 2 }} />
                  <TextField
                    fullWidth multiline minRows={8} label="Email Body (HTML)"
                    value={form.body_html} onChange={setField('body_html')} sx={{ mb: 2 }}
                  />

                  <Typography variant="caption" color="text.secondary">Insert variable:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, my: 1 }}>
                    {VARIABLES.map((v) => (
                      <Chip key={v} label={`{{${v}}}`} size="small" variant="outlined" onClick={() => insertVariable(v)} />
                    ))}
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button variant="contained" startIcon={<Save />} disabled={saveMutation.isPending}
                      onClick={() => saveMutation.mutate(form)}>
                      {saveMutation.isPending ? 'Saving…' : 'Save'}
                    </Button>
                    <Button variant="outlined" startIcon={<Visibility />} onClick={openPreview}>Preview</Button>
                  </Stack>

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="subtitle2" gutterBottom>Send test email</Typography>
                  {testMsg && <Alert severity={testMsg.type} sx={{ mb: 2 }}>{testMsg.text}</Alert>}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <TextField size="small" fullWidth label="Test email address" value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)} />
                    <Button variant="outlined" startIcon={<Send />} disabled={!testEmail || sendTestMutation.isPending}
                      onClick={() => sendTestMutation.mutate()}>
                      Send Test
                    </Button>
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <EmailPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        preview={previewMutation.data}
        loading={previewMutation.isPending}
      />
    </Box>
  );
}
