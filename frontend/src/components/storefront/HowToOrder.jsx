import { Box, Grid, Typography, alpha } from '@mui/material';
import { Storefront, ShoppingCart, CheckCircle } from '@mui/icons-material';

const STEPS = [
  { icon: Storefront, title: 'Browse catalog', desc: 'Live inventory from our POS' },
  { icon: ShoppingCart, title: 'Add to cart', desc: 'See real-time stock levels' },
  { icon: CheckCircle, title: 'Place order', desc: 'We prepare it in-store' },
];

export default function HowToOrder({ primaryColor }) {
  return (
    <Box sx={{ py: 1 }}>
      <Typography variant="h6" fontWeight={700} align="center" gutterBottom>
        How online ordering works
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
        Orders placed here sync directly with our point of sale
      </Typography>
      <Grid container spacing={2}>
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <Grid item xs={12} md={4} key={step.title}>
              <Box
                sx={{
                  p: 2.5,
                  height: '100%',
                  borderRadius: 2,
                  bgcolor: alpha(primaryColor, 0.04),
                  border: '1px solid',
                  borderColor: alpha(primaryColor, 0.12),
                  textAlign: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    bgcolor: alpha(primaryColor, 0.12),
                    color: primaryColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 1.5,
                  }}
                >
                  <Icon fontSize="small" />
                </Box>
                <Typography variant="caption" color="primary" fontWeight={700}>
                  Step {i + 1}
                </Typography>
                <Typography fontWeight={700} sx={{ mt: 0.5 }}>{step.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{step.desc}</Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
