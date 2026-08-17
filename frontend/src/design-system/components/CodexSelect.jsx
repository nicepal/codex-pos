import { Select, NativeSelect } from '@mantine/core';
import { CODEX_TOKENS } from '../theme/codexTheme';

/**
 * Select for ops UI. Use `native` for dense POS headers (branch pickers)
 * where NativeSelect is faster and scanner-friendly.
 */
export default function CodexSelect({ native = false, style, styles, ...props }) {
  const Comp = native ? NativeSelect : Select;
  return (
    <Comp
      {...props}
      style={style}
      styles={{
        ...styles,
        input: {
          minHeight: CODEX_TOKENS.touchMin,
          ...(typeof styles?.input === 'object' ? styles.input : null),
        },
      }}
    />
  );
}
