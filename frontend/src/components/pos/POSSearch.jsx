import { forwardRef, useState } from 'react';
import { Group, Notification } from '@mantine/core';
import { Search, QrCodeScanner } from '@mui/icons-material';
import { CodexInput } from '../../design-system';

/**
 * Combined barcode + product search. Barcode field stays focusable for scanners.
 * Props / refs match the previous MUI implementation.
 */
const POSSearch = forwardRef(function POSSearch({
  search,
  onSearchChange,
  onBarcodeKeyDown,
  searchInputRef,
  disabled = false,
  barcodeFeedback = null,
  onClearBarcodeFeedback,
}, barcodeRef) {
  const [localMiss, setLocalMiss] = useState(false);

  const wrapKeyDown = (e) => {
    onBarcodeKeyDown?.(e);
    if (e.key === 'Enter' && e.target.value === '' && barcodeFeedback === 'miss') {
      setLocalMiss(true);
    }
  };

  const barcodeShadow = barcodeFeedback === 'hit'
    ? '0 0 0 2px var(--mantine-color-teal-6)'
    : barcodeFeedback === 'miss'
      ? '0 0 0 2px var(--mantine-color-red-6)'
      : undefined;

  return (
    <>
      <Group gap="sm" wrap="wrap" grow preventGrowOverflow={false}>
        <CodexInput
          ref={barcodeRef}
          placeholder="Scan barcode…"
          onKeyDown={wrapKeyDown}
          disabled={disabled}
          error={barcodeFeedback === 'miss' ? true : undefined}
          leftSection={(
            <QrCodeScanner
              fontSize="small"
              color={barcodeFeedback === 'hit' ? 'success' : barcodeFeedback === 'miss' ? 'error' : 'action'}
            />
          )}
          aria-label="Barcode scan"
          autoComplete="off"
          style={{ flex: '1 1 220px', maxWidth: 280 }}
          styles={{
            input: {
              boxShadow: barcodeShadow,
              transition: 'box-shadow 0.2s',
            },
          }}
        />
        <CodexInput
          ref={searchInputRef}
          placeholder="Search products (F2 / ⌘K)…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={disabled}
          leftSection={<Search fontSize="small" color="action" />}
          aria-label="Product search"
          autoComplete="off"
          style={{ flex: '1 1 240px' }}
        />
      </Group>
      {(barcodeFeedback === 'miss' || localMiss) && (
        <Notification
          color="red"
          title="Barcode not found"
          mt="xs"
          onClose={() => {
            setLocalMiss(false);
            onClearBarcodeFeedback?.();
          }}
          style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 4000, maxWidth: 360 }}
        >
          No product matched that barcode.
        </Notification>
      )}
    </>
  );
});

export default POSSearch;
