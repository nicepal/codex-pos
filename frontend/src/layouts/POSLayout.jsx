import { Outlet } from 'react-router-dom';
import { Box } from '@mantine/core';
import { BusinessCurrencyProvider } from '../contexts/BusinessCurrencyContext';

/**
 * Full-viewport POS workspace — no business sidebar or dashboard chrome.
 * Mantine shell; MUI CssBaseline still applied globally via AppThemeProvider.
 */
export default function POSLayout() {
  return (
    <BusinessCurrencyProvider>
      <Box
        style={{
          width: '100vw',
          height: '100dvh',
          maxHeight: '100dvh',
          overflow: 'hidden',
          background: 'var(--codex-bg, var(--mantine-color-body))',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Outlet />
      </Box>
    </BusinessCurrencyProvider>
  );
}
