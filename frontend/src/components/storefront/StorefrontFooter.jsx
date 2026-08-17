import { Box, Typography, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import { SF, storefrontContainerSx } from './storefrontTheme';

/**
 * Minimal store footer — merchant name + subtle Powered by CodexPOS.
 */
export default function StorefrontFooter({ storeName, basePath, footerText }) {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        pt: 4,
        pb: 3,
        borderTop: '1px solid',
        borderColor: SF.colors.borderSubtle,
        bgcolor: SF.colors.paper,
      }}
    >
      <Box sx={storefrontContainerSx()}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Box>
            <Typography fontWeight={700} sx={{ fontSize: 14 }}>{storeName}</Typography>
            {footerText ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 420 }}>
                {footerText}
              </Typography>
            ) : null}
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Typography
                component={Link}
                to={basePath}
                variant="caption"
                sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
              >
                Order
              </Typography>
              <Typography
                component={Link}
                to={`${basePath}/shop`}
                variant="caption"
                sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
              >
                All products
              </Typography>
              <Typography
                component={Link}
                to={`${basePath}/account`}
                variant="caption"
                sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
              >
                Account
              </Typography>
            </Stack>
          </Box>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontSize: 11, letterSpacing: '0.02em' }}
          >
            Powered by CodexPOS
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
