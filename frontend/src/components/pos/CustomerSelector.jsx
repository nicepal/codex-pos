import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Autocomplete } from '@mantine/core';
import { CODEX_TOKENS } from '../../design-system/theme/codexTheme';

/**
 * Customer picker for cart / table flows.
 * Exposes \`focus()\` via ref for F4 / header “Customer” shortcut.
 * Autocomplete ref is typed as HTMLInputElement in Mantine 8.
 */
const CustomerSelector = forwardRef(function CustomerSelector({
  customer,
  customers = [],
  onChange,
  disabled = false,
  size = 'sm',
}, ref) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState(customer?.name || customer?.email || '');

  useImperativeHandle(ref, () => ({
    focus: () => {
      const el = inputRef.current;
      if (!el) return;
      if (typeof el.focus === 'function') {
        el.focus();
        return;
      }
      // Fallback if a wrapper element is returned
      el.querySelector?.('input')?.focus();
    },
  }), []);

  useEffect(() => {
    setQuery(customer?.name || customer?.email || '');
  }, [customer]);

  const options = useMemo(
    () => (customers || []).map((c) => ({
      value: String(c.id),
      label: c.name || c.email || String(c.id),
      customer: c,
    })),
    [customers],
  );

  return (
    <Autocomplete
      ref={inputRef}
      size={size}
      label="Customer"
      placeholder="Optional (F4)"
      disabled={disabled}
      data={options}
      value={query}
      onChange={(val) => {
        setQuery(val);
        if (!val) onChange(null);
      }}
      onOptionSubmit={(val) => {
        const match = options.find((o) => o.value === val || o.label === val);
        if (match) {
          onChange(match.customer);
          setQuery(match.label);
        }
      }}
      styles={{
        input: { minHeight: CODEX_TOKENS.touchMin },
      }}
    />
  );
});

export default CustomerSelector;
