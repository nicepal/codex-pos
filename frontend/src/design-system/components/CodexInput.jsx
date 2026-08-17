import { forwardRef } from 'react';
import { TextInput } from '@mantine/core';
import { CODEX_TOKENS } from '../theme/codexTheme';

/** Touch-height text input for register barcode/search/forms. */
const CodexInput = forwardRef(function CodexInput({ style, styles, ...props }, ref) {
  return (
    <TextInput
      ref={ref}
      {...props}
      style={style}
      styles={{
        ...styles,
        input: {
          minHeight: CODEX_TOKENS.touchComfort,
          ...(typeof styles?.input === 'object' ? styles.input : null),
        },
      }}
    />
  );
});

export default CodexInput;
