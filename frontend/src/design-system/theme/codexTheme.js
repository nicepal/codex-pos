import { createTheme } from '@mantine/core';

/**
 * CodexPOS operational theme (POS / Restaurant / KDS / Customer Display).
 * Aligns with existing brand blue from AppThemeProvider; light-first, dark-ready.
 *
 * CSS variables are emitted by MantineProvider. Prefer tokens over hard-coded hex
 * in new operational UI.
 */

/** 10-shade Mantine palette (index 6 = primary main ≈ #2563eb) */
export const CODEX_BLUE = [
  '#eff6ff',
  '#dbeafe',
  '#bfdbfe',
  '#93c5fd',
  '#60a5fa',
  '#3b82f6',
  '#2563eb',
  '#1d4ed8',
  '#1e40af',
  '#1e3a8a',
];

export const CODEX_TOKENS = {
  brand: 'CodexPOS',
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  bgLight: '#f8fafc',
  paperLight: '#ffffff',
  bgDark: '#0f172a',
  paperDark: '#1e293b',
  kdsBg: '#0d1117',
  kdsFg: '#e6edf3',
  touchMin: 44,
  touchComfort: 48,
  radius: 10,
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
};

export const codexTheme = createTheme({
  fontFamily: CODEX_TOKENS.fontFamily,
  primaryColor: 'codex',
  defaultRadius: 'md',
  cursorType: 'pointer',
  colors: {
    codex: CODEX_BLUE,
  },
  primaryShade: { light: 6, dark: 5 },
  white: '#ffffff',
  black: '#0f172a',
  other: {
    ...CODEX_TOKENS,
  },
  headings: {
    fontFamily: CODEX_TOKENS.fontFamily,
    fontWeight: '700',
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          fontWeight: 600,
        },
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
        size: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'md',
        size: 'md',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'md',
        centered: true,
        overlayProps: { backgroundOpacity: 0.45, blur: 2 },
      },
    },
    Drawer: {
      defaultProps: {
        radius: 'md',
        overlayProps: { backgroundOpacity: 0.35, blur: 1 },
      },
    },
    Alert: {
      defaultProps: {
        radius: 'md',
      },
    },
    Notification: {
      defaultProps: {
        radius: 'md',
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
        withBorder: true,
      },
    },
    Badge: {
      defaultProps: {
        radius: 'sm',
      },
    },
  },
});

/** Optional CSS-variable resolver for future dark-mode ops surfaces */
export function codexCssVariablesResolver(theme) {
  return {
    variables: {
      '--codex-touch-min': `${theme.other?.touchMin || 44}px`,
      '--codex-touch-comfort': `${theme.other?.touchComfort || 48}px`,
      '--codex-brand-primary': theme.other?.primary || CODEX_TOKENS.primary,
    },
    light: {
      '--codex-surface': CODEX_TOKENS.paperLight,
      '--codex-bg': CODEX_TOKENS.bgLight,
    },
    dark: {
      '--codex-surface': CODEX_TOKENS.paperDark,
      '--codex-bg': CODEX_TOKENS.bgDark,
    },
  };
}
