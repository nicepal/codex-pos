import { Box, Button, Typography } from '@mui/material';
import { Delete } from '@mui/icons-material';

export default function BulkDeleteToolbar({
  count,
  onClear,
  onDelete,
  label = 'selected',
  deleteLabel = 'Delete selected',
}) {
  if (!count) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 2,
        px: 2,
        py: 1.25,
        borderRadius: 1,
        bgcolor: 'action.selected',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="body2" fontWeight={600}>
        {count} {label}
      </Typography>
      <Button size="small" onClick={onClear}>Clear</Button>
      <Button
        size="small"
        color="error"
        variant="contained"
        startIcon={<Delete />}
        onClick={onDelete}
      >
        {deleteLabel}
      </Button>
    </Box>
  );
}
