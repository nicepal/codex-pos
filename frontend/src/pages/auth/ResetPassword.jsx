import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Box, Card, CardContent, TextField, Button, Typography, Alert } from '@mui/material';
import api from '../../services/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Card sx={{ width: 400 }}>
        <CardContent>
          <Typography variant="h5" fontWeight={700} gutterBottom>Reset Password</Typography>
          {done ? <Alert severity="success">Password updated. <Link to="/login">Login</Link></Alert> : (
            <form onSubmit={handleSubmit}>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <TextField fullWidth label="New Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required sx={{ mb: 2 }} />
              <Button type="submit" variant="contained" fullWidth disabled={!token}>Reset Password</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
