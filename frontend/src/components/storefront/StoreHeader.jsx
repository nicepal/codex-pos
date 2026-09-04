import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton, ListItemText,
  Divider, Stack, Badge, Button, alpha, Menu, MenuItem, ListItemIcon,
} from '@mui/material';
import {
  ShoppingBagOutlined, Menu as MenuIcon, Close, PersonOutline, Logout, ReceiptLong,
} from '@mui/icons-material';
import { resolveProductImageSrc } from '../../utils/imageUrl';
import { useStorefrontCustomer } from '../../hooks/useStorefrontCustomer';
import { storeAccountLoginPath } from '../../utils/storefrontAuthRedirect';
import StoreSearch from './StoreSearch';
import FulfillmentSegment from './FulfillmentSegment';
import { SF, storefrontContainerSx } from './storefrontTheme';

/**
 * Sticky header:
 * Desktop — Logo | Search | Delivery/Pickup | Account | Cart
 * Mobile  — Row1 Logo + Cart · Row2 full-width search
 */
export default function StoreHeader({
  storeName,
  logoUrl,
  basePath,
  primaryColor,
  cartCount,
  categories = [],
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onSearchSelect,
  searchResults = [],
  searchLoading = false,
  onCartOpen,
  hasDelivery = true,
  hasPickup = false,
  fulfillmentType = 'delivery',
  onFulfillmentChange,
  sticky = true,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState(null);
  const location = useLocation();
  const { isLoggedIn, displayName, customer, logout, isLoading: authLoading } = useStorefrontCustomer();
  const resolvedLogo = logoUrl && !logoFailed ? resolveProductImageSrc(logoUrl) : null;
  const initial = (storeName || 'S').trim().charAt(0).toUpperCase();
  const accountInitial = (displayName || customer?.email || 'A').trim().charAt(0).toUpperCase();
  const returnPath = `${location.pathname}${location.search}`;
  const signInPath = storeAccountLoginPath(basePath, returnPath);

  const closeAccountMenu = () => setAccountAnchor(null);

  const accountControl = (
    <>
      <Button
        onClick={(e) => {
          if (isLoggedIn) setAccountAnchor(e.currentTarget);
        }}
        component={!isLoggedIn ? Link : undefined}
        to={!isLoggedIn ? signInPath : undefined}
        state={!isLoggedIn ? { from: returnPath } : undefined}
        aria-label={isLoggedIn ? 'Account menu' : 'Sign in'}
        startIcon={
          isLoggedIn ? (
            <Box
              sx={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                bgcolor: alpha(primaryColor, 0.15),
                color: primaryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {accountInitial}
            </Box>
          ) : (
            <PersonOutline sx={{ fontSize: 20 }} />
          )
        }
        sx={{
          display: { xs: 'none', md: 'inline-flex' },
          minWidth: 0,
          px: 1.25,
          height: 40,
          borderRadius: `${SF.radius.sm}px`,
          color: 'text.primary',
          fontWeight: 650,
          textTransform: 'none',
          maxWidth: 160,
          '&:hover': { bgcolor: alpha(primaryColor, 0.08) },
        }}
      >
        <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 650 }}>
          {authLoading ? '…' : (isLoggedIn ? (displayName?.split(' ')[0] || 'Account') : 'Sign in')}
        </Typography>
      </Button>
      <Menu
        anchorEl={accountAnchor}
        open={Boolean(accountAnchor)}
        onClose={closeAccountMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { minWidth: 220, mt: 1 } }}
      >
        {isLoggedIn && (
          <Box sx={{ px: 2, py: 1.25 }}>
            <Typography fontWeight={700} noWrap>{displayName || 'Customer'}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {customer?.email}
            </Typography>
          </Box>
        )}
        {isLoggedIn && <Divider />}
        <MenuItem component={Link} to={`${basePath}/account`} onClick={closeAccountMenu}>
          <ListItemIcon><PersonOutline fontSize="small" /></ListItemIcon>
          My account
        </MenuItem>
        <MenuItem component={Link} to={`${basePath}/account`} onClick={closeAccountMenu}>
          <ListItemIcon><ReceiptLong fontSize="small" /></ListItemIcon>
          Orders
        </MenuItem>
        {isLoggedIn && (
          <MenuItem
            onClick={() => {
              logout();
              closeAccountMenu();
            }}
          >
            <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
            Sign out
          </MenuItem>
        )}
      </Menu>
    </>
  );

  const searchField = (
    <StoreSearch
      value={searchValue}
      onChange={onSearchChange}
      onSubmit={onSearchSubmit}
      onSelectResult={onSearchSelect}
      results={searchResults}
      loading={searchLoading}
      primaryColor={primaryColor}
      placeholder="Search products…"
    />
  );

  const fulfillmentControl = (
    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
      <FulfillmentSegment
        value={fulfillmentType}
        onChange={onFulfillmentChange}
        hasDelivery={hasDelivery}
        hasPickup={hasPickup}
        primaryColor={primaryColor}
        size="small"
      />
    </Box>
  );

  return (
    <>
      <AppBar
        position={sticky ? 'sticky' : 'static'}
        elevation={0}
        sx={{
          bgcolor: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid',
          borderColor: 'var(--store-border, ' + SF.colors.border + ')',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          top: 0,
          zIndex: (t) => t.zIndex.appBar,
        }}
      >
        <Box sx={storefrontContainerSx()}>
          {/* Desktop row */}
          <Toolbar
            disableGutters
            sx={{
              display: { xs: 'none', md: 'flex' },
              gap: 2,
              minHeight: SF.headerHeight.md,
              py: 0.5,
            }}
          >
            <Box
              component={Link}
              to={basePath}
              aria-label={storeName || 'Store home'}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                textDecoration: 'none',
                color: 'inherit',
                flexShrink: 0,
                minWidth: 0,
              }}
            >
              {resolvedLogo ? (
                <Box
                  component="img"
                  src={resolvedLogo}
                  alt=""
                  onError={() => setLogoFailed(true)}
                  sx={{
                    height: 36,
                    maxWidth: 148,
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: `${SF.radius.sm}px`,
                    bgcolor: alpha(primaryColor, 0.1),
                    color: primaryColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontWeight: 800,
                    fontSize: 15,
                  }}
                >
                  {initial}
                </Box>
              )}
              <Typography
                fontWeight={700}
                noWrap
                sx={{
                  fontSize: 16,
                  letterSpacing: '-0.02em',
                  maxWidth: 200,
                }}
              >
                {storeName}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, maxWidth: 520, mx: 'auto' }}>
              {searchField}
            </Box>

            {fulfillmentControl}

            {accountControl}

            <Button
              onClick={onCartOpen}
              aria-label={`Cart, ${cartCount} items`}
              startIcon={(
                <Badge
                  badgeContent={cartCount}
                  color="primary"
                  max={99}
                  sx={{
                    '& .MuiBadge-badge': {
                      fontWeight: 700,
                      fontSize: 10,
                      minWidth: 16,
                      height: 16,
                    },
                  }}
                >
                  <ShoppingBagOutlined fontSize="small" />
                </Badge>
              )}
              sx={{
                minWidth: 0,
                px: 1.5,
                height: 40,
                borderRadius: `${SF.radius.sm}px`,
                color: 'text.primary',
                bgcolor: cartCount > 0 ? alpha(primaryColor, 0.08) : 'transparent',
                fontWeight: 700,
                flexShrink: 0,
                '&:hover': { bgcolor: alpha(primaryColor, 0.12) },
              }}
            >
              Cart
            </Button>
          </Toolbar>

          {/* Mobile row 1: logo + cart */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              display: { xs: 'flex', md: 'none' },
              minHeight: SF.headerHeight.xs,
              py: 0.5,
            }}
          >
            <Box
              component={Link}
              to={basePath}
              aria-label={storeName || 'Store home'}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                textDecoration: 'none',
                color: 'inherit',
                minWidth: 0,
                flex: 1,
              }}
            >
              {resolvedLogo ? (
                <Box
                  component="img"
                  src={resolvedLogo}
                  alt=""
                  onError={() => setLogoFailed(true)}
                  sx={{
                    height: 32,
                    maxWidth: 120,
                    objectFit: 'contain',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: `${SF.radius.sm}px`,
                    bgcolor: alpha(primaryColor, 0.1),
                    color: primaryColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontWeight: 800,
                    fontSize: 14,
                  }}
                >
                  {initial}
                </Box>
              )}
              <Typography
                fontWeight={700}
                noWrap
                sx={{ fontSize: 15, letterSpacing: '-0.02em', minWidth: 0 }}
              >
                {storeName}
              </Typography>
            </Box>

            <Stack direction="row" alignItems="center" spacing={0.5}>
              <IconButton
                aria-label="Open menu"
                onClick={() => setMenuOpen(true)}
                sx={{ color: 'text.secondary', width: 40, height: 40 }}
              >
                <MenuIcon fontSize="small" />
              </IconButton>
              <Button
                onClick={onCartOpen}
                aria-label={`Cart, ${cartCount} items`}
                sx={{
                  minWidth: 0,
                  px: 1,
                  height: 40,
                  borderRadius: `${SF.radius.sm}px`,
                  color: 'text.primary',
                  bgcolor: cartCount > 0 ? alpha(primaryColor, 0.08) : 'transparent',
                  fontWeight: 700,
                  '&:hover': { bgcolor: alpha(primaryColor, 0.12) },
                }}
              >
                <Badge
                  badgeContent={cartCount}
                  color="primary"
                  max={99}
                  sx={{
                    '& .MuiBadge-badge': {
                      fontWeight: 700,
                      fontSize: 10,
                      minWidth: 16,
                      height: 16,
                    },
                  }}
                >
                  <ShoppingBagOutlined />
                </Badge>
              </Button>
            </Stack>
          </Stack>

          {/* Mobile row 2: search */}
          <Box
            sx={{
              display: { xs: 'block', md: 'none' },
              pb: 1,
              minHeight: SF.mobileSearchHeight,
            }}
          >
            {searchField}
          </Box>
        </Box>
      </AppBar>

      <Drawer
        anchor="left"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        PaperProps={{ sx: { width: 'min(300px, 88vw)' } }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5 }}>
          <Typography fontWeight={700}>{storeName}</Typography>
          <IconButton aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <Close />
          </IconButton>
        </Stack>
        <Divider />
        <List sx={{ py: 1 }}>
          <ListItemButton component={Link} to={basePath} onClick={() => setMenuOpen(false)}>
            <ListItemText primary="Menu" primaryTypographyProps={{ fontWeight: 600 }} />
          </ListItemButton>
          <ListItemButton component={Link} to={`${basePath}/shop`} onClick={() => setMenuOpen(false)}>
            <ListItemText primary="All products" />
          </ListItemButton>
          {isLoggedIn ? (
            <>
              <ListItemButton component={Link} to={`${basePath}/account`} onClick={() => setMenuOpen(false)}>
                <ListItemText
                  primary={displayName || 'My account'}
                  secondary={customer?.email}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItemButton>
              <ListItemButton
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
              >
                <ListItemText primary="Sign out" />
              </ListItemButton>
            </>
          ) : (
            <ListItemButton component={Link} to={signInPath} state={{ from: returnPath }} onClick={() => setMenuOpen(false)}>
              <ListItemText primary="Sign in" primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          )}
        </List>
        {categories.length > 0 && (
          <>
            <Divider />
            <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 2, pb: 0.5, display: 'block', fontWeight: 600 }}>
              Categories
            </Typography>
            <List dense>
              {categories.map((c) => (
                <ListItemButton
                  key={c.id}
                  component={Link}
                  to={`${basePath}/shop?category=${c.slug}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <ListItemText primary={c.name} />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </Drawer>
    </>
  );
}
