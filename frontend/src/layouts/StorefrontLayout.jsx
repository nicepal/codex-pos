import { useMemo, useState } from 'react';
import { Outlet, Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, AppBar, Toolbar, Typography, Container, Button, Badge,
  ThemeProvider, Stack, TextField, InputAdornment, Menu, MenuItem,
} from '@mui/material';
import { ShoppingCart, Search, KeyboardArrowDown } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { resolveImageUrl } from '../utils/imageUrl';
import { resolveCurrency } from '../utils/currency';
import { createStorefrontTheme } from '../components/storefront/storefrontTheme';
import StorefrontFooter from '../components/storefront/StorefrontFooter';
import TrustBar from '../components/storefront/TrustBar';
import AnnouncementBar from '../components/storefront/AnnouncementBar';

function StorefrontShell() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = `/store/${slug}`;
  const cartCount = useSelector((s) => s.storefrontCart.items.reduce((n, i) => n + i.quantity, 0));
  const [headerSearch, setHeaderSearch] = useState('');
  const [catAnchor, setCatAnchor] = useState(null);

  const { data: theme } = useQuery({
    queryKey: ['storefront-theme', slug],
    queryFn: () => api.get('/storefront/theme').then((r) => r.data.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['storefront-categories', slug],
    queryFn: () => api.get('/storefront/categories').then((r) => r.data.data),
  });

  const themeSettings = theme?.theme || {};
  const primaryColor = themeSettings.primary_color || '#2563eb';
  const backgroundColor = themeSettings.background_color || '#f4f6f9';
  const announcementColor = themeSettings.announcement_color || primaryColor;
  const storeName = theme?.name || 'Store';
  const logoUrl = resolveImageUrl(theme?.logo_url);
  const currency = resolveCurrency(theme?.currency);
  const showAnnouncement = themeSettings.show_announcement !== false;
  const announcement = themeSettings.announcement_text
    || 'Order online · Inventory synced with our POS · Pickup & delivery available';

  const storefrontTheme = useMemo(
    () => createStorefrontTheme({ primaryColor, backgroundColor }),
    [primaryColor, backgroundColor],
  );

  const handleHeaderSearch = (e) => {
    if (e.key === 'Enter' && headerSearch.trim()) {
      navigate(`${basePath}/shop?q=${encodeURIComponent(headerSearch.trim())}`);
    }
  };

  const navActive = (path) => {
    if (path === basePath) return location.pathname === basePath;
    return location.pathname.startsWith(path);
  };

  const outletContext = {
    basePath, slug, primaryColor, storeName, currency,
    showStock: themeSettings.show_stock !== false,
  };
  const isHome = location.pathname === basePath || location.pathname === `${basePath}/`;

  return (
    <ThemeProvider theme={storefrontTheme}>
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        {showAnnouncement && (
          <AnnouncementBar message={announcement} primaryColor={announcementColor} />
        )}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Container maxWidth="lg">
            <Toolbar disableGutters sx={{ gap: 2, py: 1, minHeight: { xs: 64, md: 72 } }}>
              <Box
                component={Link}
                to={basePath}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', color: 'inherit', flexShrink: 0 }}
              >
                {logoUrl ? (
                  <Box
                    component="img"
                    src={logoUrl}
                    alt={storeName}
                    sx={{ height: 36, maxWidth: 180, objectFit: 'contain' }}
                  />
                ) : (
                  <Typography variant="h6" fontWeight={800}>
                    {storeName}
                  </Typography>
                )}
              </Box>

              <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
                <Button
                  component={Link}
                  to={basePath}
                  sx={{ color: navActive(basePath) ? 'primary.main' : 'text.secondary', fontWeight: navActive(basePath) ? 700 : 500 }}
                >
                  Home
                </Button>
                <Button
                  component={Link}
                  to={`${basePath}/shop`}
                  sx={{ color: navActive(`${basePath}/shop`) ? 'primary.main' : 'text.secondary', fontWeight: navActive(`${basePath}/shop`) ? 700 : 500 }}
                >
                  Shop
                </Button>
                <Button
                  endIcon={<KeyboardArrowDown />}
                  onClick={(e) => setCatAnchor(e.currentTarget)}
                  sx={{ color: 'text.secondary', fontWeight: 500 }}
                >
                  Categories
                </Button>
                <Menu anchorEl={catAnchor} open={!!catAnchor} onClose={() => setCatAnchor(null)}>
                  <MenuItem component={Link} to={`${basePath}/shop`} onClick={() => setCatAnchor(null)}>All Products</MenuItem>
                  {(categories || []).map((c) => (
                    <MenuItem
                      key={c.id}
                      component={Link}
                      to={`${basePath}/shop?category=${c.slug}`}
                      onClick={() => setCatAnchor(null)}
                    >
                      {c.name}
                    </MenuItem>
                  ))}
                </Menu>
              </Stack>

              <TextField
                size="small"
                placeholder="Search products..."
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                onKeyDown={handleHeaderSearch}
                sx={{
                  flexGrow: 1,
                  maxWidth: 360,
                  display: { xs: 'none', sm: 'block' },
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#f8fafc',
                    borderRadius: 2,
                    '& fieldset': { borderColor: 'divider' },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ fontSize: 20, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                component={Link}
                to={`${basePath}/cart`}
                sx={{ minWidth: 'auto', color: 'text.primary', p: 1 }}
              >
                <Badge badgeContent={cartCount} color="error" max={99}>
                  <ShoppingCart />
                </Badge>
              </Button>
            </Toolbar>
          </Container>
        </AppBar>

        {isHome ? (
          <Box sx={{ flexGrow: 1 }}>
            <Outlet context={outletContext} />
          </Box>
        ) : (
          <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 }, flexGrow: 1 }}>
            <Outlet context={outletContext} />
          </Container>
        )}

        <Box sx={{ px: 2, pb: 2, bgcolor: 'background.default' }}>
          <Container maxWidth="lg">
            <TrustBar />
          </Container>
        </Box>

        <StorefrontFooter
          storeName={storeName}
          basePath={basePath}
          primaryColor={primaryColor}
          footerText={themeSettings.footer_text}
        />
      </Box>
    </ThemeProvider>
  );
}

export default function StorefrontLayout() {
  return <StorefrontShell />;
}
