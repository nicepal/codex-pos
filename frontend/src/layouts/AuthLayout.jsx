import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Stack, Link, IconButton, alpha,
} from '@mui/material';
import {
  PointOfSale, Storefront, Inventory2, DarkMode, LightMode,
  TrendingUp, Groups, Speed,
} from '@mui/icons-material';
import { useColorMode } from '../AppThemeProvider';
import { useTheme } from '@mui/material/styles';

const FEATURES = [
  { icon: PointOfSale, title: 'Fast POS', desc: 'Sell in-store with barcode scan & split payments' },
  { icon: Storefront, title: 'Online shop', desc: 'Built-in storefront for every business' },
  { icon: Inventory2, title: 'Inventory', desc: 'Stock tracking, alerts & purchase orders' },
];

function BrandPanel() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        position: 'relative',
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '44%',
        minHeight: '100vh',
        p: 5,
        color: '#fff',
        overflow: 'hidden',
        background: isDark
          ? 'linear-gradient(145deg, #0f172a 0%, #1e3a5f 45%, #312e81 100%)'
          : 'linear-gradient(145deg, #1d4ed8 0%, #2563eb 40%, #7c3aed 100%)',
      }}
    >
      {/* Decorative grid */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.07,
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: -120,
          right: -80,
          width: 360,
          height: 360,
          borderRadius: '50%',
          bgcolor: alpha('#fff', 0.08),
          filter: 'blur(40px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -80,
          left: -60,
          width: 280,
          height: 280,
          borderRadius: '50%',
          bgcolor: alpha('#fff', 0.06),
          filter: 'blur(32px)',
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              bgcolor: alpha('#fff', 0.15),
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${alpha('#fff', 0.2)}`,
            }}
          >
            <PointOfSale sx={{ fontSize: 26 }} />
          </Box>
          <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">
            Codex POS
          </Typography>
        </Stack>
        <Typography variant="h3" fontWeight={800} sx={{ mt: 6, mb: 2, lineHeight: 1.15, letterSpacing: '-0.03em' }}>
          Run your entire business from one platform
        </Typography>
        <Typography sx={{ opacity: 0.85, fontSize: '1.05rem', maxWidth: 380, lineHeight: 1.6 }}>
          Point of sale, inventory, online shop, and reports — built for modern retailers.
        </Typography>
      </Box>

      <Stack spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <Stack
            key={title}
            direction="row"
            spacing={2}
            alignItems="flex-start"
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: alpha('#fff', 0.1),
              backdropFilter: 'blur(12px)',
              border: `1px solid ${alpha('#fff', 0.12)}`,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: alpha('#fff', 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography fontWeight={700}>{title}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>{desc}</Typography>
            </Box>
          </Stack>
        ))}
      </Stack>

      <Stack direction="row" spacing={3} sx={{ position: 'relative', zIndex: 1, opacity: 0.75 }}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <TrendingUp sx={{ fontSize: 18 }} />
          <Typography variant="body2">Real-time analytics</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Groups sx={{ fontSize: 18 }} />
          <Typography variant="body2">Multi-user teams</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Speed sx={{ fontSize: 18 }} />
          <Typography variant="body2">14-day free trial</Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  maxWidth = 420,
}) {
  const { mode, toggleColorMode } = useColorMode();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <BrandPanel />

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {/* Mobile brand bar */}
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            gap: 1.5,
            px: 3,
            py: 2.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <PointOfSale sx={{ fontSize: 20 }} />
          </Box>
          <Typography fontWeight={800} letterSpacing="-0.02em">Codex POS</Typography>
        </Box>

        <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
          <IconButton onClick={toggleColorMode} size="small" aria-label="Toggle theme">
            {mode === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
          </IconButton>
        </Box>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: { xs: 3, sm: 4 },
            py: { xs: 4, md: 6 },
          }}
        >
          <Box sx={{ width: '100%', maxWidth }}>
            <Typography
              variant="h4"
              fontWeight={800}
              letterSpacing="-0.03em"
              gutterBottom
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography color="text.secondary" sx={{ mb: 3.5, lineHeight: 1.6 }}>
                {subtitle}
              </Typography>
            )}
            {children}
            {footer && (
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                {footer}
              </Box>
            )}
          </Box>
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          align="center"
          sx={{ pb: 3, opacity: 0.7 }}
        >
          © {new Date().getFullYear()} Codex POS · Secure cloud POS platform
        </Typography>
      </Box>
    </Box>
  );
}

export function AuthLink({ to, children }) {
  return (
    <Link
      component={RouterLink}
      to={to}
      underline="hover"
      fontWeight={600}
      color="primary"
    >
      {children}
    </Link>
  );
}
