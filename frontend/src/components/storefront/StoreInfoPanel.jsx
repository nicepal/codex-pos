import { Box, Typography, Stack, alpha } from '@mui/material';
import { Phone, Email, LocationOn, Payments } from '@mui/icons-material';
import { STOREFRONT_COLORS } from './storefrontTheme';

export default function StoreInfoPanel({ store, primaryColor }) {
  if (!store) return null;

  const items = [
    store.phone && { icon: Phone, label: store.phone, href: `tel:${store.phone}` },
    store.email && { icon: Email, label: store.email, href: `mailto:${store.email}` },
    store.address && { icon: LocationOn, label: store.address },
  ].filter(Boolean);

  if (!items.length) return null;

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: STOREFRONT_COLORS.paper,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>Store details</Typography>
      <Stack spacing={1.5}>
        {items.map((item) => {
          const Icon = item.icon;
          const content = (
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <Icon sx={{ fontSize: 20, color: primaryColor, mt: 0.2 }} />
              <Typography variant="body2" color="text.secondary">{item.label}</Typography>
            </Stack>
          );
          return item.href ? (
            <Box
              key={item.label}
              component="a"
              href={item.href}
              sx={{ textDecoration: 'none', color: 'inherit', '&:hover': { color: primaryColor } }}
            >
              {content}
            </Box>
          ) : (
            <Box key={item.label}>{content}</Box>
          );
        })}
      </Stack>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Payments sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary">
          Cash on delivery · Card · Bank transfer accepted at checkout
        </Typography>
      </Stack>
    </Box>
  );
}
