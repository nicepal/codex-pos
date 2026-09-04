import { PasswordInput } from '@mantine/core';

/**
 * react-hook-form password field with built-in show/hide toggle (Mantine PasswordInput).
 */
export default function AuthPasswordField({
  register,
  name = 'password',
  rules,
  label = 'Password',
  helperText,
  error,
  size,
  InputProps: _inputProps,
  fullWidth: _fullWidth,
  ...rest
}) {
  const registered = register(name, rules);
  const isRequired = Boolean(
    rules?.required === true ||
      (typeof rules?.required === 'string' && rules.required.length > 0),
  );

  return (
    <PasswordInput
      w="100%"
      label={label}
      required={isRequired}
      error={(typeof error === 'string' && error) || helperText || undefined}
      size={size === 'small' ? 'sm' : size === 'large' ? 'lg' : size || 'md'}
      {...rest}
      {...registered}
    />
  );
}
