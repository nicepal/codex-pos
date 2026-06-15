import { Box, Typography, Stack } from '@mui/material';

export default function StorefrontThemePreview({
  primaryColor = '#2563eb',
  announcementColor,
  backgroundColor = '#f4f6f9',
  storeName = 'Your Store',
}) {
  const barColor = announcementColor || primaryColor;

  return (
    <Box
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ py: 0.75, px: 1.5, bgcolor: barColor, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: '#fff', fontWeight: 500 }}>
          Announcement bar preview
        </Typography>
      </Box>
      <Box sx={{ bgcolor: '#fff', px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" fontWeight={700} sx={{ color: primaryColor }}>
          {storeName}
        </Typography>
      </Box>
      <Box sx={{ bgcolor: backgroundColor, p: 1.5 }}>
        <Stack direction="row" spacing={1}>
          <Box sx={{ flex: 1, height: 48, borderRadius: 1, bgcolor: '#fff', border: '1px solid', borderColor: 'divider' }} />
          <Box sx={{ flex: 1, height: 48, borderRadius: 1, bgcolor: '#fff', border: '1px solid', borderColor: 'divider' }} />
        </Stack>
        <Box
          sx={{
            mt: 1,
            py: 0.75,
            px: 1.5,
            borderRadius: 1,
            bgcolor: primaryColor,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            textAlign: 'center',
            width: 'fit-content',
          }}
        >
          Add to cart
        </Box>
      </Box>
    </Box>
  );
}
