import { Children, isValidElement } from 'react';
import { TextInput, Textarea, NativeSelect } from '@mantine/core';

function mapSize(size) {
  if (size === 'small') return 'sm';
  if (size === 'large') return 'lg';
  return size || 'md';
}

/**
 * Text field wired to react-hook-form.
 * Accepts legacy MUI-ish props (select, multiline, inputProps, fullWidth) for gradual migration.
 */
export default function RHFTextField({
  register,
  name,
  rules,
  required: requiredProp,
  fullWidth,
  helperText,
  error,
  select,
  children,
  multiline,
  rows,
  inputProps,
  InputLabelProps,
  InputProps,
  FormHelperTextProps,
  margin,
  variant,
  size,
  type,
  ...rest
}) {
  const isRequired =
    requiredProp ??
    Boolean(
      rules?.required === true ||
        (typeof rules?.required === 'string' && rules.required.length > 0),
    );

  void fullWidth;
  void InputLabelProps;
  void InputProps;
  void FormHelperTextProps;
  void margin;
  void variant;

  const registered = register(name, rules);
  const shared = {
    w: '100%',
    required: isRequired,
    error: (typeof error === 'string' && error) || helperText || undefined,
    size: mapSize(size),
    ...rest,
    ...registered,
  };

  if (select) {
    const options = Children.toArray(children)
      .filter(isValidElement)
      .map((child) => {
        const value = child.props.value ?? '';
        const label = child.props.children;
        return (
          <option key={String(value)} value={value}>
            {label}
          </option>
        );
      });

    return (
      <NativeSelect {...shared} data={undefined}>
        {options}
      </NativeSelect>
    );
  }

  if (multiline) {
    return (
      <Textarea
        {...shared}
        minRows={rows || 3}
        autosize={Boolean(rows)}
      />
    );
  }

  return (
    <TextInput
      {...shared}
      type={type}
      {...(inputProps || {})}
    />
  );
}
