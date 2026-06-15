import { alpha, createTheme } from '@mui/material/styles';

export const STOREFRONT_COLORS = {
  bg: '#f4f6f9',
  paper: '#ffffff',
  paperMuted: '#f8fafc',
  border: '#e2e8f0',
  textMuted: '#64748b',
};

export function createStorefrontTheme({
  primaryColor = '#2563eb',
  backgroundColor = STOREFRONT_COLORS.bg,
} = {}) {
  return createTheme({
    palette: {
      mode: 'light',
      primary: { main: primaryColor, dark: primaryColor, light: alpha(primaryColor, 0.85) },
      success: { main: '#16a34a' },
      error: { main: '#dc2626' },
      warning: { main: '#d97706' },
      background: { default: backgroundColor, paper: STOREFRONT_COLORS.paper },
      text: { primary: '#0f172a', secondary: STOREFRONT_COLORS.textMuted },
      divider: STOREFRONT_COLORS.border,
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700, color: '#0f172a' },
      h5: { fontWeight: 700, color: '#0f172a' },
      h6: { fontWeight: 600, color: '#0f172a' },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, borderRadius: 8, boxShadow: 'none' },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
            border: `1px solid ${STOREFRONT_COLORS.border}`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: { root: { backgroundImage: 'none', boxShadow: 'none' } },
      },
    },
  });
}
