import { Box, Typography, Button, Stack } from '@mui/material';

export default function PageHeader({ title, subtitle, action, actionLabel, actionIcon, onAction, secondaryAction }) {
  const defaultAction = actionLabel ? (
    <Button variant="contained" startIcon={actionIcon} onClick={onAction}>{actionLabel}</Button>
  ) : null;

  const actions = action !== undefined ? action : (
    <Stack direction="row" spacing={1}>
      {secondaryAction && (
        <Button variant="outlined" startIcon={secondaryAction.icon} onClick={secondaryAction.onClick}>
          {secondaryAction.label}
        </Button>
      )}
      {defaultAction}
    </Stack>
  );

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
      <Box>
        <Typography variant="h5" fontWeight={700}>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>}
      </Box>
      {actions}
    </Box>
  );
}
