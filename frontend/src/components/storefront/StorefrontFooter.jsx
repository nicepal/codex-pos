import { Link } from 'react-router-dom';
import { Box, Container, Grid, Typography, Stack, IconButton } from '@mui/material';
import { Storefront, Facebook, Twitter, Instagram } from '@mui/icons-material';

export default function StorefrontFooter({ storeName, basePath, primaryColor, footerText }) {
  const linkSx = { color: 'text.secondary', textDecoration: 'none', fontSize: 14, '&:hover': { color: 'primary.main' } };

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        pt: 6,
        pb: 3,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Storefront sx={{ color: primaryColor }} />
              <Typography fontWeight={800}>{storeName}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {footerText || 'Powered by EYZ POS'}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Shop</Typography>
            <Stack spacing={1}>
              <Box component={Link} to={`${basePath}/shop`} sx={linkSx}>All Products</Box>
              <Box component={Link} to={basePath} sx={linkSx}>Home</Box>
            </Stack>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Company</Typography>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">About Us</Typography>
              <Typography variant="body2" color="text.secondary">Contact</Typography>
            </Stack>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Help</Typography>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">Shipping</Typography>
              <Typography variant="body2" color="text.secondary">Returns</Typography>
            </Stack>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Follow Us</Typography>
            <Stack direction="row" spacing={0.5}>
              {[Facebook, Twitter, Instagram].map((Icon, i) => (
                <IconButton key={i} size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                  <Icon fontSize="small" />
                </IconButton>
              ))}
            </Stack>
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          © {new Date().getFullYear()} {storeName}. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}
