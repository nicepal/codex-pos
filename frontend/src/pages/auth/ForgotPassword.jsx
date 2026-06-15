import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Card, CardContent, TextField, Button, Typography, Alert } from '@mui/material';
import api from '../../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed');
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Card sx={{ width: 400 }}>
        <CardContent>
          <Typography variant="h5" fontWeight={700} gutterBottom>Forgot Password</Typography>
          {sent ? <Alert severity="success">If that email exists, a reset link was sent.</Alert> : (
            <form onSubmit={handleSubmit}>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <TextField fullWidth label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required sx={{ mb: 2 }} />
              <Button type="submit" variant="contained" fullWidth>Send Reset Link</Button>
            </form>
          )}
          <Button component={Link} to="/login" fullWidth sx={{ mt: 2 }}>Back to Login</Button>
        </CardContent>
      </Card>
    </Box>
  );
}
