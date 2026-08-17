import {
  Box, Typography, Stack, Paper, Divider, List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import {
  Category, Inventory2, Image, Store, AutoAwesome,
} from '@mui/icons-material';

export default function SetupConfirm({ businessType, typeMeta, onBack }) {
  const items = [
    { icon: Store, title: 'Use your main branch', desc: 'Stock is seeded on your default store location.' },
    { icon: Category, title: `${typeMeta?.estimatedCategories || '—'} starter categories`, desc: 'Organized for your business type.' },
    { icon: Inventory2, title: `${typeMeta?.estimatedProducts || '—'} sample products`, desc: 'Priced with cost & ~25 units of stock each.' },
    { icon: Image, title: 'Placeholder product images', desc: 'Simple local placeholders you can replace later.' },
    { icon: AutoAwesome, title: 'No fake sales data', desc: 'We never invent orders, customers, or revenue.' },
  ];

  return (
    <Box maxWidth={720} mx="auto">
      <Typography variant="h4" fontWeight={800} letterSpacing="-0.03em" gutterBottom>
        Ready to set up {typeMeta?.label || 'your business'}?
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Codex POS will create a light starter catalog. You can edit or delete everything afterward.
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography fontWeight={700}>Setup summary</Typography>
          <Typography
            component="button"
            onClick={onBack}
            sx={{
              border: 0,
              background: 'none',
              color: 'primary.main',
              cursor: 'pointer',
              font: 'inherit',
              fontWeight: 600,
            }}
          >
            Change type
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Business type: <strong>{typeMeta?.label || businessType}</strong>
        </Typography>
        <Divider sx={{ mb: 1 }} />
        <List disablePadding>
          {items.map(({ icon: Icon, title, desc }) => (
            <ListItem key={title} disableGutters sx={{ py: 1.25 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Icon color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={title}
                secondary={desc}
                primaryTypographyProps={{ fontWeight: 600 }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
}
