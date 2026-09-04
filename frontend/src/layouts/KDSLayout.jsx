import { Outlet } from 'react-router-dom';
import { Box } from '@mantine/core';
import { BusinessCurrencyProvider } from '../contexts/BusinessCurrencyContext';
import { CODEX_TOKENS } from '../design-system/theme/codexTheme';
import { RouteFeatureGate } from '../components/FeatureGate';

/** Full-screen kitchen display — no admin sidebar. */
export default function KDSLayout() {
  return (
    <BusinessCurrencyProvider>
      <Box
        style={{
          width: '100vw',
          height: '100dvh',
          maxHeight: '100dvh',
          overflow: 'hidden',
          background: CODEX_TOKENS.kdsBg,
          color: CODEX_TOKENS.kdsFg,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <RouteFeatureGate>
          <Outlet />
        </RouteFeatureGate>
      </Box>
    </BusinessCurrencyProvider>
  );
}
