import { useEffect, useState } from 'react';
import { Stack, Text, Table, Group, Divider } from '@mantine/core';
import { CodexModal, CodexButton } from '../../design-system';

const SHORTCUTS = [
  { keys: 'F2 / ⌘K / Ctrl+K', action: 'Focus product search' },
  { keys: 'F4', action: 'Focus customer' },
  { keys: 'F6', action: 'Hold sale (POS Pro)' },
  { keys: 'F8 / ⌘↵ / Ctrl+Enter', action: 'Open cash checkout' },
  { keys: 'Esc', action: 'Close dialogs / cart drawer' },
];

/**
 * Global POS keyboard shortcuts + help dialog.
 * Does not steal keys while typing in inputs except for F-keys / modifiers.
 */
export default function POSKeyboardShortcuts({
  enabled = true,
  onFocusSearch,
  onFocusCustomer,
  onHold,
  onPay,
  onEscape,
  canHold = false,
  helpOpen: helpOpenProp,
  onHelpOpenChange,
}) {
  const [internalHelp, setInternalHelp] = useState(false);
  const helpOpen = helpOpenProp ?? internalHelp;
  const setHelpOpen = onHelpOpenChange || setInternalHelp;

  useEffect(() => {
    if (!enabled) return undefined;

    const handler = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      const inField = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (helpOpen) {
          setHelpOpen(false);
          return;
        }
        onEscape?.();
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        onFocusSearch?.();
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        onFocusCustomer?.();
        return;
      }
      if (e.key === 'F6' && canHold) {
        e.preventDefault();
        onHold?.();
        return;
      }
      if (e.key === 'F8') {
        e.preventDefault();
        onPay?.();
        return;
      }

      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onFocusSearch?.();
        return;
      }
      if (meta && e.key === 'Enter') {
        e.preventDefault();
        onPay?.();
        return;
      }

      // Don't hijack typing otherwise
      if (inField) return;
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onFocusSearch, onFocusCustomer, onHold, onPay, onEscape, canHold, helpOpen, setHelpOpen]);

  return (
    <CodexModal
      opened={helpOpen}
      onClose={() => setHelpOpen(false)}
      size="md"
      title="Keyboard shortcuts"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Designed for fast cashier workflows. Barcode scanners still work when the scan field is focused.
        </Text>
        <Table striped highlightOnHover withTableBorder>
          <Table.Tbody>
            {SHORTCUTS.map((row) => (
              <Table.Tr key={row.keys}>
                <Table.Td style={{ fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap', width: '45%' }}>
                  {row.keys}
                </Table.Td>
                <Table.Td>{row.action}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Divider />
        <Group justify="flex-end">
          <CodexButton variant="default" onClick={() => setHelpOpen(false)} touch>
            Close
          </CodexButton>
        </Group>
      </Stack>
    </CodexModal>
  );
}
