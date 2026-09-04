import { Box, Typography, Stack, Button, Paper } from '@mui/material';
import { PointOfSale, Dashboard, CheckCircle, Restaurant } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuth } from '../../../features/auth/authSlice';

export default function SetupComplete({ summary }) {
  const navigate = useNavigate();
  const { tenant } = useSelector(selectAuth);
  const created = summary?.created || summary?.progress || {};
  const isRestaurant = tenant?.business_type === 'restaurant'
    || summary?.business_type === 'restaurant';

  return (
    <Box maxWidth={640} mx="auto" textAlign="center">
      <CheckCircle color="success" sx={{ fontSize: 56, mb: 2 }} />
      <Typography variant="h4" fontWeight={800} letterSpacing="-0.03em" gutterBottom>
        You&apos;re ready to sell
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Your PosHive starter catalog is set up. Open the POS to make a sale, or explore the dashboard.
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 4,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          textAlign: 'left',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Categories: {created.categories_created ?? '—'} ·{' '}
          Products: {((created.products_created || 0) + (created.products_skipped || 0)) || created.total_products || '—'} ·{' '}
          Stock lines: {created.stock_seeded ?? '—'}
        </Typography>
      </Paper>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
        <Button
          variant="contained"
          size="large"
          startIcon={<PointOfSale />}
          onClick={() => navigate('/pos')}
          sx={{ px: 3, py: 1.4 }}
        >
          Open POS
        </Button>
        {isRestaurant && (
          <Button
            variant="outlined"
            size="large"
            startIcon={<Restaurant />}
            onClick={() => navigate('/restaurant/settings')}
            sx={{ px: 3, py: 1.4 }}
          >
            Set up tables
          </Button>
        )}
        <Button
          variant="outlined"
          size="large"
          startIcon={<Dashboard />}
          onClick={() => navigate('/dashboard')}
          sx={{ px: 3, py: 1.4 }}
        >
          Go to Dashboard
        </Button>
      </Stack>
    </Box>
  );
}
