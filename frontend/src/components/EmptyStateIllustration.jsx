import { Box } from '@mantine/core';
import {
  Storefront, Inventory2, Category, Groups, Receipt, ShoppingCart,
  LocalShipping, SupportAgent, Business, Loyalty,
} from '@mui/icons-material';
import { CODEX_TOKENS } from '../design-system';

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

function withAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Decorative empty illustration — MUI icons only; no MUI layout. */
export default function EmptyStateIllustration({ type = 'store', size = 120 }) {
  const Icon = ICONS[type] || Storefront;
  const primary = CODEX_TOKENS.primary;
  const dots = [
    { top: 4, left: '50%', transform: 'translateX(-50%)' },
    { right: 4, top: '50%', transform: 'translateY(-50%)' },
    { bottom: 4, left: '30%' },
    { left: 8, top: '25%' },
  ];

  return (
    <Box pos="relative" w={size} h={size} mx="auto" mb="md">
      <Box
        pos="absolute"
        inset={0}
        style={{ borderRadius: '50%', background: withAlpha(primary, 0.08) }}
      />
      <Box
        pos="absolute"
        style={{
          inset: 12,
          borderRadius: 12,
          background: withAlpha(primary, 0.12),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${withAlpha(primary, 0.2)}`,
        }}
      >
        <Icon style={{ fontSize: size * 0.4, color: primary }} />
      </Box>
      {dots.map((style, i) => (
        <Box
          key={i}
          pos="absolute"
          w={8}
          h={8}
          style={{
            borderRadius: '50%',
            background: withAlpha(primary, 0.35),
            opacity: 0.5 + (i % 2) * 0.3,
            ...style,
          }}
        />
      ))}
    </Box>
  );
}
