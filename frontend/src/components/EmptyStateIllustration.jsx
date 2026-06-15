import { Box, alpha, useTheme } from '@mui/material';
import {
  Storefront, Inventory2, Category, Groups, Receipt, ShoppingCart,
  LocalShipping, SupportAgent, Business, Loyalty,
} from '@mui/icons-material';

const ICONS = {
  store: Storefront,
  products: Inventory2,
  categories: Category,
  people: Groups,
  orders: Receipt,
  cart: ShoppingCart,
  suppliers: LocalShipping,
  support: SupportAgent,
  business: Business,
  customers: Loyalty,
};

export default function EmptyStateIllustration({ type = 'store', size = 120 }) {
  const theme = useTheme();
  const Icon = ICONS[type] || Storefront;
  const primary = theme.palette.primary.main;

  return (
    <Box sx={{ position: 'relative', width: size, height: size, mx: 'auto', mb: 3 }}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          bgcolor: alpha(primary, 0.08),
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 12,
          borderRadius: 3,
          bgcolor: alpha(primary, 0.12),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid',
          borderColor: alpha(primary, 0.2),
        }}
      >
        <Icon sx={{ fontSize: size * 0.4, color: primary }} />
      </Box>
      {['top', 'right', 'bottom', 'left'].map((pos, i) => (
        <Box
          key={pos}
          sx={{
            position: 'absolute',
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: alpha(primary, 0.35),
            ...(pos === 'top' && { top: 4, left: '50%', transform: 'translateX(-50%)' }),
            ...(pos === 'right' && { right: 4, top: '50%', transform: 'translateY(-50%)' }),
            ...(pos === 'bottom' && { bottom: 4, left: '30%' }),
            ...(pos === 'left' && { left: 8, top: '25%' }),
            opacity: 0.5 + (i % 2) * 0.3,
          }}
        />
      ))}
    </Box>
  );
}
