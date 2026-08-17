import { Box, Button, Typography, Stack, alpha } from '@mui/material';
import { KeyboardArrowRight } from '@mui/icons-material';
import useStoreCurrency from '../../hooks/useStoreCurrency';
import { SF } from './storefrontTheme';

/**
 * Sticky floating cart bar (mobile + desktop) when cart has items.
 */
export default function MobileCartBar({
  itemCount,
  subtotal,
  primaryColor,
  onOpen,
  visible,
}) {
  const { formatMoney } = useStoreCurrency();

  if (!visible || itemCount <= 0) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (t) => t.zIndex.snackbar,
        display: { xs: 'flex', md: 'none' },
        justifyContent: 'center',
        px: 2,
        pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        pt: 0.75,
        pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(247,248,250,0) 0%, rgba(247,248,250,0.9) 35%, rgba(247,248,250,1) 100%)',
      }}
    >
      <Button
        onClick={onOpen}
        variant="contained"
        sx={{
          pointerEvents: 'auto',
          width: '100%',
          maxWidth: '100%',
          minHeight: 52,
          py: 1.25,
          px: 2,
          borderRadius: `${SF.radius.md}px`,
          bgcolor: primaryColor,
          boxShadow: '0 8px 24px rgba(15,23,42,0.18)',
          '&:hover': { bgcolor: alpha(primaryColor, 0.92) },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography fontWeight={750} sx={{ fontSize: 15, letterSpacing: '-0.01em' }}>
              {itemCount === 1 ? '1 item' : `${itemCount} items`}
            </Typography>
            <Typography sx={{ opacity: 0.75, fontSize: 13 }}>·</Typography>
            <Typography fontWeight={800} sx={{ fontSize: 15, letterSpacing: '-0.02em' }}>
              {formatMoney(subtotal)}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.25}>
            <Typography fontWeight={700} sx={{ fontSize: 14 }}>
              View cart
            </Typography>
            <KeyboardArrowRight sx={{ fontSize: 22, opacity: 0.9 }} />
          </Stack>
        </Stack>
      </Button>
    </Box>
  );
}
