import { forwardRef } from 'react';
import { TextInput, PasswordInput } from '@mantine/core';
import { CODEX_TOKENS } from '../theme/codexTheme';

/** Touch-height text input for register barcode/search/forms. Password type uses Mantine PasswordInput (eye toggle). */
const CodexInput = forwardRef(function CodexInput({ style, styles, type, ...props }, ref) {
  const isPassword = type === 'password';
  const Component = isPassword ? PasswordInput : TextInput;
  const touchStyles = {
    ...styles,
    input: {
      minHeight: CODEX_TOKENS.touchComfort,
      ...(typeof styles?.input === 'object' ? styles.input : null),
    },
  };

  return (
    <Component
      ref={ref}
      {...props}
      {...(isPassword ? {} : { type })}
      style={style}
      styles={touchStyles}
    />
  );
});

export default CodexInput;
