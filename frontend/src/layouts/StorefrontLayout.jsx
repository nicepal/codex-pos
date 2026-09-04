import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, ThemeProvider, Drawer, CssBaseline,
} from '@mui/material';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { resolveProductImageSrc } from '../utils/imageUrl';
import { resolveCurrency } from '../utils/currency';
import { customerFacingAnnouncement } from '../utils/storefrontContent';
import { createStorefrontTheme, SF, storefrontContainerSx, storefrontCssVars } from '../components/storefront/storefrontTheme';
import StorefrontFooter from '../components/storefront/StorefrontFooter';
import AnnouncementBar from '../components/storefront/AnnouncementBar';
import StoreHeader from '../components/storefront/StoreHeader';
import CartDrawer from '../components/storefront/CartDrawer';
import MobileCartBar from '../components/storefront/MobileCartBar';
import ProductDetails from '../components/storefront/ProductDetails';
import {
  selectStoreCartCount, selectStoreCartTotal,
} from '../features/storefront/cartSlice';
import useStorefrontCartPersistence from '../hooks/useStorefrontCartPersistence';
import useDebounce from '../hooks/useDebounce';
import { StorefrontUIContext } from '../contexts/StorefrontUIContext';
import { applyDocumentSeo } from '../utils/documentSeo';

export { useStorefrontUI } from '../contexts/StorefrontUIContext';

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';

function fulfillmentStorageKey(slug) {
  return `storefront-fulfillment-${slug}`;
}

function loadFulfillmentPref(slug, hasPickup) {
  if (!slug || typeof window === 'undefined') return hasPickup ? 'pickup' : 'delivery';
  try {
    const stored = localStorage.getItem(fulfillmentStorageKey(slug));
    if (stored === 'pickup' && hasPickup) return 'pickup';
    if (stored === 'delivery') return 'delivery';
  } catch { /* ignore */ }
  return hasPickup ? 'pickup' : 'delivery';
}

function useStorefrontFont() {
  useEffect(() => {
    const id = 'storefront-font-jakarta';
    if (document.getElementById(id)) return undefined;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
    return undefined;
  }, []);
}

function useStoreSeo({ storeName, description, enabled = true }) {
  useEffect(() => {
    if (!enabled || !storeName) return undefined;
    return applyDocumentSeo({
      title: `${storeName} — Order Online`,
      description,
      type: 'website',
      siteName: storeName,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  }, [storeName, description, enabled]);
}

function StorefrontShell() {
  useStorefrontFont();
  const { slug } = useParams();
  useStorefrontCartPersistence(slug);
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = `/store/${slug}`;
  const cartCount = useSelector(selectStoreCartCount);
  const cartTotal = useSelector(selectStoreCartTotal);

  const [headerSearch, setHeaderSearch] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [detailSlug, setDetailSlug] = useState(null);
  const debouncedHeaderSearch = useDebounce(headerSearch, 280);

  const { data: theme } = useQuery({
    queryKey: ['storefront-theme', slug],
    queryFn: () => api.get('/storefront/theme').then((r) => r.data.data),
  });

  const { data: store } = useQuery({
    queryKey: ['store-info', slug],
    queryFn: () => api.get('/storefront').then((r) => r.data.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['storefront-categories', slug],
    queryFn: () => api.get('/storefront/categories').then((r) => r.data.data),
  });

  const {
    data: detailProduct,
    isLoading: detailLoading,
    isError: detailError,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ['storefront-product', slug, detailSlug],
    queryFn: () => api.get(`/storefront/products/${detailSlug}`).then((r) => r.data.data),
    enabled: Boolean(detailSlug),
  });

  const searchQ = debouncedHeaderSearch.trim();
  const {
    data: searchSuggestData,
    isFetching: searchSuggestLoading,
  } = useQuery({
    queryKey: ['storefront-search-suggest', slug, searchQ],
    queryFn: () => api.get('/storefront/products', {
      params: { search: searchQ, limit: 8 },
    }).then((r) => r.data),
    enabled: searchQ.length >= 2,
    staleTime: 20_000,
  });
  const searchResults = searchSuggestData?.data || [];

  const { data: branches } = useQuery({
    queryKey: ['storefront-branches', slug],
    queryFn: () => api.get('/storefront/branches').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const hasPickupBranches = Array.isArray(branches) && branches.length > 0;
  // Pickup / delivery toggle is restaurant-only (Foodora-style menus).
  const isRestaurant = store?.business_type === 'restaurant';
  const hasPickup = isRestaurant && hasPickupBranches;
  const hasDelivery = isRestaurant;

  const [fulfillmentType, setFulfillmentType] = useState(() => loadFulfillmentPref(slug, false));

  useEffect(() => {
    setFulfillmentType(loadFulfillmentPref(slug, hasPickup));
  }, [slug, hasPickup]);

  const handleFulfillmentChange = useCallback((next) => {
    setFulfillmentType(next);
    if (slug) {
      try {
        localStorage.setItem(fulfillmentStorageKey(slug), next);
      } catch { /* ignore */ }
    }
  }, [slug]);

  const themeSettings = theme?.theme || {};
  const primaryColor = themeSettings.primary_color || '#2563eb';
  const backgroundColor = themeSettings.background_color || SF.colors.bg;
  const announcementColor = themeSettings.announcement_color || primaryColor;
  const storeName = theme?.name || store?.name || 'Store';
  const logoUrl = resolveProductImageSrc(theme?.logo_url || store?.logo_url);
  const currency = resolveCurrency(theme?.currency || store?.currency);
  const showAnnouncement = themeSettings.show_announcement !== false;
  const announcement = customerFacingAnnouncement(themeSettings.announcement_text);

  const seoDescription = customerFacingAnnouncement(themeSettings.banner_text)
    || customerFacingAnnouncement(themeSettings.tagline)
    || store?.address
    || `Order online from ${storeName}`;

  useStoreSeo({
    storeName,
    description: seoDescription,
    enabled: !location.pathname.includes('/product/'),
  });

  const storefrontTheme = useMemo(
    () => createStorefrontTheme({ primaryColor, backgroundColor }),
    [primaryColor, backgroundColor],
  );

  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const clearSearch = useCallback(() => setHeaderSearch(''), []);

  const openProductDetails = useCallback((productOrSlug) => {
    const s = typeof productOrSlug === 'string' ? productOrSlug : productOrSlug?.slug;
    if (!s) return;
    // Always use the product page URL so items are shareable / SEO-friendly.
    navigate(`${basePath}/product/${s}`);
  }, [navigate, basePath]);

  const closeProductDetails = useCallback(() => setDetailSlug(null), []);

  const isHome = location.pathname === basePath || location.pathname === `${basePath}/`;

  const handleSearchSubmit = () => {
    const q = headerSearch.trim();
    // On home, in-page filter already handles search — keep user on menu.
    if (isHome) return;
    if (q) navigate(`${basePath}/shop?q=${encodeURIComponent(q)}`);
    else navigate(`${basePath}/shop`);
  };

  const handleSearchSelect = useCallback((product) => {
    if (!product?.slug) return;
    setHeaderSearch('');
    openProductDetails(product);
  }, [openProductDetails]);

  // Prefill search from URL on shop
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (location.pathname.includes('/shop') && params.get('q')) {
      setHeaderSearch(params.get('q'));
    }
  }, [location.pathname, location.search]);

  const outletContext = useMemo(() => ({
    basePath,
    slug,
    primaryColor,
    storeName,
    currency,
    showStock: themeSettings.show_stock !== false,
    logoUrl,
    store,
    themeSettings,
    // Pass through undefined while loading — never seed child queries with []
    categories,
    openCart,
    openProductDetails,
    searchQuery: debouncedHeaderSearch,
    clearSearch,
    hasPickup,
    hasDelivery,
    isRestaurant,
    fulfillmentType,
    onFulfillmentChange: handleFulfillmentChange,
  }), [
    basePath, slug, primaryColor, storeName, currency, themeSettings,
    logoUrl, store, categories, openCart, openProductDetails,
    debouncedHeaderSearch, clearSearch, hasPickup, hasDelivery, isRestaurant,
    fulfillmentType, handleFulfillmentChange,
  ]);

  const uiValue = useMemo(() => ({
    openCart, closeCart, cartOpen, openProductDetails, closeProductDetails, currency,
  }), [openCart, closeCart, cartOpen, openProductDetails, closeProductDetails, currency]);

  const hideMobileBar = location.pathname.includes('/checkout')
    || location.pathname.includes('/cart')
    || location.pathname.includes('/order/');

  return (
    <ThemeProvider theme={storefrontTheme}>
      <CssBaseline />
      <StorefrontUIContext.Provider value={uiValue}>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'var(--store-background, ' + backgroundColor + ')',
            ...storefrontCssVars({ primaryColor, backgroundColor }),
          }}
        >
          {showAnnouncement && announcement && (
            <AnnouncementBar message={announcement} primaryColor={announcementColor} />
          )}

          <StoreHeader
            storeName={storeName}
            logoUrl={logoUrl}
            basePath={basePath}
            primaryColor={primaryColor}
            cartCount={cartCount}
            categories={categories ?? []}
            searchValue={headerSearch}
            onSearchChange={setHeaderSearch}
            onSearchSubmit={handleSearchSubmit}
            onSearchSelect={handleSearchSelect}
            searchResults={searchResults}
            searchLoading={searchSuggestLoading}
            onCartOpen={openCart}
            hasDelivery={hasDelivery}
            hasPickup={hasPickup}
            fulfillmentType={fulfillmentType}
            onFulfillmentChange={handleFulfillmentChange}
          />

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              ...storefrontContainerSx({
                pb: cartCount > 0 && !hideMobileBar ? `${SF.mobileCartPad}px` : { xs: 3, md: 4 },
                pt: { xs: 0.5, md: 0.75 },
              }),
            }}
          >
            <Outlet context={outletContext} />
          </Box>

          <StorefrontFooter
            storeName={storeName}
            basePath={basePath}
            footerText={themeSettings.footer_text}
          />

          <CartDrawer
            open={cartOpen}
            onClose={closeCart}
            basePath={basePath}
            primaryColor={primaryColor}
          />

          <MobileCartBar
            visible={!hideMobileBar}
            itemCount={cartCount}
            subtotal={cartTotal}
            primaryColor={primaryColor}
            onOpen={openCart}
          />

          {/* Optional quick-view drawer (kept for deep links / future use) */}
          <Drawer
            anchor="right"
            open={Boolean(detailSlug)}
            onClose={closeProductDetails}
            PaperProps={{
              sx: {
                width: { sm: 440, md: 480 },
                maxWidth: '100%',
              },
            }}
          >
            <ProductDetails
              product={detailProduct}
              loading={detailLoading}
              error={detailError ? 'Could not load this product.' : null}
              onRetry={() => refetchDetail()}
              onClose={closeProductDetails}
              primaryColor={primaryColor}
              showStock={themeSettings.show_stock !== false}
              basePath={basePath}
              storeName={storeName}
            />
          </Drawer>
        </Box>
      </StorefrontUIContext.Provider>
    </ThemeProvider>
  );
}

export default function StorefrontLayout() {
  return <StorefrontShell />;
}
