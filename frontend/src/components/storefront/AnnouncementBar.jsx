import { Box, Typography } from '@mui/material';

/** Compact promotional bar — merchant primary color */
export default function AnnouncementBar({ message, primaryColor = '#2563eb' }) {
  if (!message?.trim()) return null;

  return (
    <Box
      sx={{
        minHeight: 36,
        py: 0.75,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'var(--store-primary, ' + primaryColor + ')',
        color: '#fff',
      }}
    >
      <Typography
        variant="body2"
        fontWeight={550}
        sx={{
          fontSize: { xs: 12, sm: 13 },
          letterSpacing: '0.01em',
          lineHeight: 1.35,
          textAlign: 'center',
        }}
      >
        {message}
      </Typography>
    </Box>
  );
}
