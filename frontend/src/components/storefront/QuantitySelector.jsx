import { Box, IconButton, Typography, alpha } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import { SF } from './storefrontTheme';

export default function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  allowZero = false,
  size = 'medium',
  primaryColor,
}) {
  const effectiveMin = allowZero ? 0 : min;
  const compact = size === 'small';
  // Compact card steppers stay tight; cart drawer keeps larger touch targets
  const btnSize = compact ? 30 : 40;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid',
        borderColor: SF.colors.border,
        borderRadius: SF.radius.sm,
        bgcolor: SF.colors.paper,
        overflow: 'hidden',
      }}
    >
      <IconButton
        size="small"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(effectiveMin, value - 1))}
        disabled={value <= effectiveMin}
        sx={{
          width: btnSize,
          height: btnSize,
          borderRadius: 0,
          color: primaryColor || 'text.primary',
        }}
      >
        <Remove sx={{ fontSize: compact ? 17 : 18 }} />
      </IconButton>
      <Typography
        sx={{
          minWidth: compact ? 28 : 36,
          textAlign: 'center',
          fontWeight: 750,
          fontSize: compact ? 13.5 : 14.5,
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </Typography>
      <IconButton
        size="small"
        aria-label="Increase quantity"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        sx={{
          width: btnSize,
          height: btnSize,
          borderRadius: 0,
          color: primaryColor || 'text.primary',
          bgcolor: primaryColor ? alpha(primaryColor, 0.07) : 'transparent',
        }}
      >
        <Add sx={{ fontSize: compact ? 17 : 18 }} />
      </IconButton>
    </Box>
  );
}
