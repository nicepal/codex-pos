import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Alert, Box, CircularProgress, Typography,
} from '@mui/material';
import api from '../../../../services/api';

export default function TestConnectionDialog({ open, onClose, currentConfig }) {
  const [email, setEmail] = useState('');

  const testMutation = useMutation({
    mutationFn: (testEmail) => {
      // Include the in-progress form config so admins can test before saving.
      const payload = { test_email: testEmail };
      if (currentConfig?.host && currentConfig?.from_email) {
        Object.assign(payload, {
          host: currentConfig.host,
          port: Number(currentConfig.port),
          username: currentConfig.username || undefined,
          encryption: currentConfig.encryption,
          from_email: currentConfig.from_email,
          from_name: currentConfig.from_name || undefined,
          reply_to_email: currentConfig.reply_to_email || undefined,
        });
        if (currentConfig.password && currentConfig.password !== '************') {
          payload.password = currentConfig.password;
        }
      }
      return api.post('/admin/email/test', payload).then((r) => r.data);
    },
  });

  const result = testMutation.data?.data;
  const reqError = testMutation.isError ? (testMutation.error?.response?.data?.message || 'Request failed') : null;

  const handleClose = () => {
    testMutation.reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Test SMTP Connection</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Sends a test email using the current settings to verify connection, authentication and delivery.
        </Typography>
        <TextField
          fullWidth
          label="Test Email Address"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2 }}
        />

        {testMutation.isPending && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={20} /><Typography variant="body2">Sending test email…</Typography>
          </Box>
        )}
        {reqError && <Alert severity="error">{reqError}</Alert>}
        {result && result.success && <Alert severity="success">Success! Test email sent. Check the inbox.</Alert>}
        {result && !result.success && (
          <Alert severity="error">
            Failed: {result.error || 'Unknown error'}{result.code ? ` (${result.code})` : ''}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button
          variant="contained"
          onClick={() => testMutation.mutate(email)}
          disabled={!email || testMutation.isPending}
        >
          Send Test Email
        </Button>
      </DialogActions>
    </Dialog>
  );
}
