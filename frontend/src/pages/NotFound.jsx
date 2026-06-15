import { Box, Typography, Button } from '@mui/material';
import { Home, SearchOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', px: 2 }}>
      <SearchOff sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h4" fontWeight={700} gutterBottom>Page not found</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>The page you are looking for does not exist or has been moved.</Typography>
      <Button variant="contained" startIcon={<Home />} onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
    </Box>
  );
}
