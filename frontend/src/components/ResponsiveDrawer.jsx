import { useState } from 'react';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItemButton,
  ListItemIcon, ListItemText, IconButton, Avatar, Menu, MenuItem, Divider,
  useMediaQuery, useTheme, Collapse,
} from '@mui/material';
import { Menu as MenuIcon, Logout, ExpandLess, ExpandMore, Brightness4, Brightness7 } from '@mui/icons-material';
import { useColorMode } from '../AppThemeProvider';

const DRAWER_WIDTH = 260;

export default function ResponsiveDrawer({
  title, subtitle, navGroups, user, onLogout, children, headerExtra,
}) {
  const theme = useTheme();
  const { mode, toggleColorMode } = useColorMode();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const [expanded, setExpanded] = useState(() => {
    const init = {};
    navGroups.forEach((g) => { init[g.label] = true; });
    return init;
  });

  const toggleGroup = (label) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const drawerContent = (
    <Box sx={{ pt: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" sx={{ px: 2, mb: 0.5, fontWeight: 700, color: 'primary.main' }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" sx={{ px: 2, color: 'text.secondary', display: 'block', mb: 2 }}>
          {subtitle}
        </Typography>
      )}
      <Divider />
      <List sx={{ flex: 1, overflowY: 'auto' }}>
        {navGroups.map((group) => (
          <Box key={group.label}>
            {group.collapsible !== false ? (
              <>
                <ListItemButton onClick={() => toggleGroup(group.label)} sx={{ py: 0.5 }}>
                  <ListItemText primary={group.label} primaryTypographyProps={{ variant: 'caption', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }} />
                  {expanded[group.label] ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </ListItemButton>
                <Collapse in={expanded[group.label]}>
                  {group.items.map((item) => (
                    <ListItemButton
                      key={item.path}
                      selected={item.selected}
                      onClick={() => { item.onClick(); if (isMobile) setMobileOpen(false); }}
                      sx={{ pl: 3 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  ))}
                </Collapse>
              </>
            ) : (
              group.items.map((item) => (
                <ListItemButton
                  key={item.path}
                  selected={item.selected}
                  onClick={() => { item.onClick(); if (isMobile) setMobileOpen(false); }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              ))
            )}
          </Box>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1, noWrap: true }} noWrap>
            {subtitle || title}
          </Typography>
          {headerExtra}
          <IconButton color="inherit" onClick={toggleColorMode} sx={{ mr: 1 }}>
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32 }}>{user?.initial || 'U'}</Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
            {user?.email && <MenuItem disabled>{user.email}</MenuItem>}
            <Divider />
            <MenuItem onClick={onLogout}>
              <Logout fontSize="small" sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
          >
            <Toolbar />
            {drawerContent}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{ width: DRAWER_WIDTH, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
            open
          >
            <Toolbar />
            {drawerContent}
          </Drawer>
        )}
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
