import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, Alert,
} from '@mui/material';

export default function FormDialog({
  open, title, onClose, onSubmit, children, submitLabel = 'Save', loading = false, maxWidth = 'sm',
  error, errorAction,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      <form onSubmit={onSubmit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {error && (
              <Grid item xs={12}>
                <Alert
                  severity="error"
                  action={errorAction ? (
                    <Button color="inherit" size="small" onClick={errorAction.onClick}>
                      {errorAction.label}
                    </Button>
                  ) : undefined}
                >
                  {error}
                </Alert>
              </Grid>
            )}
            {children}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Saving...' : submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
