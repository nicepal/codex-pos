import { Box, Grid, Typography } from '@mui/material';
import {
  Inventory2, Sync, LocalShipping, Payments,
} from '@mui/icons-material';

const ITEMS = [
  { icon: Inventory2, label: 'Live stock from POS' },
  { icon: Sync, label: 'Real-time pricing' },
  { icon: LocalShipping, label: 'Pickup & delivery' },
  { icon: Payments, label: 'Cash, card & bank transfer' },
];

export default function TrustBar() {
  return (
    <Box
      sx={{
        py: 2.5,
        px: 2,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Grid container spacing={2} justifyContent="center">
        {ITEMS.map(({ icon: Icon, label }) => (
          <Grid item xs={6} sm={3} key={label}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Icon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="body2" fontWeight={500} color="text.secondary">
                {label}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
