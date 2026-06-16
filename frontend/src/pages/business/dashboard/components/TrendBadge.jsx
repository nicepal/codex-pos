import { Box, Typography } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';

const TREND_CONFIG = {
  up: { color: 'success.main', Icon: TrendingUp, prefix: '↑' },
  down: { color: 'error.main', Icon: TrendingDown, prefix: '↓' },
  flat: { color: 'text.secondary', Icon: TrendingFlat, prefix: '—' },
};

export default function TrendBadge({ changePercent, comparisonLabel, trend = 'flat', size = 'small' }) {
  const config = TREND_CONFIG[trend] || TREND_CONFIG.flat;
  const variant = size === 'small' ? 'caption' : 'body2';
  const abs = Math.abs(changePercent ?? 0);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
      <config.Icon sx={{ fontSize: size === 'small' ? 14 : 18, color: config.color }} />
      <Typography variant={variant} sx={{ color: config.color, fontWeight: 600 }}>
        {config.prefix} {abs}%
      </Typography>
      {comparisonLabel && (
        <Typography variant={variant} color="text.secondary">
          {comparisonLabel}
        </Typography>
      )}
    </Box>
  );
}
