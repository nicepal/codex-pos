import { Box, Typography, Button } from '@mui/material';

export default function PageHeader({ title, subtitle, action, actionLabel, actionIcon, onAction }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
      <Box>
        <Typography variant="h5" fontWeight={700}>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>}
      </Box>
      {action !== undefined ? action : (actionLabel && (
        <Button variant="contained" startIcon={actionIcon} onClick={onAction}>{actionLabel}</Button>
      ))}
    </Box>
  );
}
