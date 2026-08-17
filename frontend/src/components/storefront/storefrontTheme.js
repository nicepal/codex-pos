import { alpha, createTheme } from '@mui/material/styles';

/** Design tokens — spacing 4–64, radius 8/12/16/18 */
export const SF = {
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 18,
  },
  colors: {
    bg: '#f7f8fa',
    paper: '#ffffff',
    paperMuted: '#f1f3f5',
    border: '#e8eaed',
    borderSubtle: '#f0f1f3',
    text: '#111827',
    textMuted: '#6b7280',
    textFaint: '#9ca3af',
    placeholder: '#e5e7eb',
  },
  maxWidth: 1280,
  /** Shared horizontal padding for header, main, footer */
  containerPx: { xs: 2, sm: 2, md: 3 },
  headerHeight: { xs: 56, md: 60 },
  mobileSearchHeight: 48,
  announcementHeight: 36,
  /** Standard ecommerce product tiles */
  imageRatio: '4 / 3',
  /** Sticky cart bar + safe area — use for main padding-bottom */
  mobileCartPad: 96,
  font: '"Plus Jakarta Sans", "DM Sans", "Helvetica Neue", sans-serif',
};

/** Consistent max-width container alignment for all storefront sections */
export function storefrontContainerSx(extra = {}) {
  return {
    width: '100%',
    maxWidth: SF.maxWidth,
    mx: 'auto',
    px: SF.containerPx,
    ...extra,
  };
}

/** Responsive product grid: 1 col narrow · 2 sm+ · 3 md+ · 4 lg+ */
export function productGridSx() {
  return (theme) => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
    [theme.breakpoints.up('sm')]: {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
    [theme.breakpoints.up('md')]: {
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    },
    [theme.breakpoints.up('lg')]: {
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    },
    gap: { xs: 1.25, sm: 1.5 },
    width: '100%',
    '& > *': { minWidth: 0 },
  });
}

/** Sticky offset below announcement + header (+ optional mobile search row) */
export function storefrontStickyTop({ isMobile, hasAnnouncement = false } = {}) {
  const top = hasAnnouncement ? SF.announcementHeight : 0;
  if (isMobile) {
    return top + SF.headerHeight.xs + SF.mobileSearchHeight;
  }
  return top + SF.headerHeight.md;
}

export function storefrontCssVars({ primaryColor, backgroundColor = SF.colors.bg } = {}) {
  const primary = primaryColor || '#2563eb';
  return {
    '--store-primary': primary,
    '--store-primary-hover': alpha(primary, 0.9),
    '--store-primary-soft': alpha(primary, 0.1),
    '--store-text': SF.colors.text,
    '--store-muted': SF.colors.textMuted,
    '--store-background': backgroundColor,
    '--store-border': SF.colors.border,
  };
}

export const STOREFRONT_COLORS = {
  bg: SF.colors.bg,
  paper: SF.colors.paper,
  paperMuted: SF.colors.paperMuted,
  border: SF.colors.border,
  textMuted: SF.colors.textMuted,
};

export function createStorefrontTheme({
  primaryColor = '#2563eb',
  backgroundColor = SF.colors.bg,
} = {}) {
  return createTheme({
    breakpoints: {
      values: {
        xs: 0,
        xsm: 480,
        sm: 600,
        md: 768,
        lg: 1200,
        xl: 1536,
      },
    },
    palette: {
      mode: 'light',
      primary: {
        main: primaryColor,
        dark: primaryColor,
        light: alpha(primaryColor, 0.85),
      },
      success: { main: '#059669' },
      error: { main: '#dc2626' },
      warning: { main: '#d97706' },
      background: { default: backgroundColor, paper: SF.colors.paper },
      text: { primary: SF.colors.text, secondary: SF.colors.textMuted },
      divider: SF.colors.border,
    },
    typography: {
      fontFamily: SF.font,
      h4: { fontWeight: 700, letterSpacing: '-0.02em', color: SF.colors.text },
      h5: { fontWeight: 700, letterSpacing: '-0.02em', color: SF.colors.text },
      h6: { fontWeight: 650, letterSpacing: '-0.01em', color: SF.colors.text },
      button: { fontWeight: 600 },
      body2: { lineHeight: 1.5 },
    },
    shape: { borderRadius: SF.radius.md },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFamily: SF.font,
            WebkitFontSmoothing: 'antialiased',
            ...storefrontCssVars({ primaryColor, backgroundColor }),
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: SF.radius.sm,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          sizeSmall: { padding: '6px 12px', fontSize: 13 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: 'none',
            border: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: { backgroundImage: 'none', boxShadow: 'none' },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 550 },
          sizeSmall: { height: 24, fontSize: 12 },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { border: 'none' },
        },
      },
    },
  });
}
