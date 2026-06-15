import { Box, Typography } from '@mui/material';
import { Star } from '@mui/icons-material';

export default function StarRating({ rating = 5, count = 24 }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} sx={{ fontSize: 18, color: i < rating ? '#fbbf24' : 'action.disabled' }} />
      ))}
      <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
        ({count} reviews)
      </Typography>
    </Box>
  );
}
