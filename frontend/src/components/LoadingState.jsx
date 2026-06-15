import { Box, CircularProgress, Typography } from '@mui/material';

export default function LoadingState({ message }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
      <CircularProgress />
      {message && <Typography color="text.secondary">{message}</Typography>}
    </Box>
  );
}
