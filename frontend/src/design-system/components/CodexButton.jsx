import { Button } from '@mantine/core';
import { CODEX_TOKENS } from '../theme/codexTheme';

/**
 * Touch-friendly button defaults for operational UI (cashier / KDS).
 */
export default function CodexButton({
  touch = false,
  children,
  style,
  styles,
  ...props
}) {
  const touchStyle = touch
    ? { minHeight: CODEX_TOKENS.touchComfort, fontWeight: 700, ...style }
    : style;

  return (
    <Button
      {...props}
      style={touchStyle}
      styles={{
        ...styles,
        root: {
          ...(typeof styles?.root === 'object' ? styles.root : null),
        },
      }}
    >
      {children}
    </Button>
  );
}
