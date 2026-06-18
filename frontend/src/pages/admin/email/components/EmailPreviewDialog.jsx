import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Divider, CircularProgress,
} from '@mui/material';

export default function EmailPreviewDialog({ open, onClose, preview, loading }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Template Preview</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : (
          <Box>
            <Typography variant="caption" color="text.secondary">Subject</Typography>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>{preview?.subject || '—'}</Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="caption" color="text.secondary">Body</Typography>
            <Box
              sx={{ mt: 1, p: 2, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.default' }}
              // Preview is rendered from admin-managed templates with sample data
              dangerouslySetInnerHTML={{ __html: preview?.body_html || '' }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
