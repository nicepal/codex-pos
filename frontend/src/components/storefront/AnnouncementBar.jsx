import { Box, Typography } from '@mui/material';

export default function AnnouncementBar({ message, primaryColor = '#2563eb' }) {
  if (!message) return null;

  return (
    <Box
      sx={{
        py: 1,
        px: 2,
        textAlign: 'center',
        bgcolor: primaryColor,
        color: '#fff',
      }}
    >
      <Typography variant="body2" fontWeight={500} sx={{ fontSize: { xs: 12, sm: 14 } }}>
        {message}
      </Typography>
    </Box>
  );
}
