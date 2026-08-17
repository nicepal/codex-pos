import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { codexTheme, codexCssVariablesResolver } from './design-system';

const ColorModeContext = createContext({ toggleColorMode: () => {}, mode: 'light' });

export function useColorMode() {
  return useContext(ColorModeContext);
}

function buildTheme(mode) {
  return createTheme({
    palette: {
      mode,
      primary: { main: '#2563eb', dark: '#1d4ed8', light: '#3b82f6' },
      secondary: { main: '#7c3aed' },
      success: { main: '#10b981' },
      warning: { main: '#f59e0b' },
      error: { main: '#ef4444' },
      background: mode === 'light'
        ? { default: '#f8fafc', paper: '#ffffff' }
        : { default: '#0f172a', paper: '#1e293b' },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
      MuiCard: { styleOverrides: { root: { boxShadow: mode === 'light' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' } } },
      MuiFormLabel: {
        styleOverrides: {
          asterisk: { color: '#ef4444' },
        },
      },
    },
  });
}

/**
 * Transitional dual theme: MUI ThemeProvider (admin/business) + MantineProvider (ops UI).
 * Color mode stays in sync so light/dark toggle affects both systems.
 */
export default function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const colorMode = useMemo(() => ({
    mode,
    toggleColorMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')),
  }), [mode]);

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MantineProvider
          theme={codexTheme}
          cssVariablesResolver={codexCssVariablesResolver}
          forceColorScheme={mode === 'dark' ? 'dark' : 'light'}
          defaultColorScheme={mode === 'dark' ? 'dark' : 'light'}
        >
          <Notifications position="bottom-right" zIndex={5000} />
          {children}
        </MantineProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
