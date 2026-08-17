import { Outlet } from 'react-router-dom';
import { Box, Container, Typography, Stack, alpha } from '@mui/material';
import { PointOfSale } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

export default function OnboardingLayout() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: isDark
          ? `radial-gradient(1200px 600px at 10% -10%, ${alpha('#2563eb', 0.25)}, transparent),
             radial-gradient(900px 500px at 100% 0%, ${alpha('#0ea5e9', 0.18)}, transparent),
             ${theme.palette.background.default}`
          : `radial-gradient(1200px 600px at 10% -10%, ${alpha('#2563eb', 0.12)}, transparent),
             radial-gradient(900px 500px at 100% 0%, ${alpha('#0ea5e9', 0.1)}, transparent),
             linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)`,
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: { xs: 3, md: 4 } }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'primary.main',
              color: '#fff',
            }}
          >
            <PointOfSale fontSize="small" />
          </Box>
          <Typography variant="h6" fontWeight={800} letterSpacing="-0.02em">
            Codex POS
          </Typography>
        </Stack>
        <Outlet />
      </Container>
    </Box>
  );
}
