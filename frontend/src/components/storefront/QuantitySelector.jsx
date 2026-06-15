import { Box, IconButton, Typography, alpha } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';

export default function QuantitySelector({ value, onChange, min = 1, max = 99 }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: alpha('#fff', 0.04),
      }}
    >
      <IconButton
        size="small"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        sx={{ borderRadius: '8px 0 0 8px' }}
      >
        <Remove fontSize="small" />
      </IconButton>
      <Typography sx={{ minWidth: 36, textAlign: 'center', fontWeight: 600 }}>{value}</Typography>
      <IconButton
        size="small"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        sx={{ borderRadius: '0 8px 8px 0' }}
      >
        <Add fontSize="small" />
      </IconButton>
    </Box>
  );
}
