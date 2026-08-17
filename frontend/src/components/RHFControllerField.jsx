import { TextInput, Textarea, NativeSelect } from '@mantine/core';

/**
 * Controller-based field with required (*) when rules require a value.
 * Accepts legacy MUI TextField props used with RHF Controller.
 */
export default function RHFControllerField({
  field,
  fieldState,
  rules,
  required: requiredProp,
  fullWidth,
  select,
  children,
  multiline,
  rows,
  helperText,
  InputLabelProps,
  InputProps,
  inputProps,
  FormHelperTextProps,
  margin,
  variant,
  size,
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

  const errorMsg = fieldState?.error?.message || (typeof helperText === 'string' ? helperText : undefined);
  const shared = {
    w: '100%',
    required: isRequired,
    error: errorMsg,
    size: size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'md',
    label: rest.label,
    description: rest.description,
    placeholder: rest.placeholder,
    disabled: rest.disabled,
    name: field.name,
    value: field.value ?? '',
    onChange: field.onChange,
    onBlur: field.onBlur,
    ref: field.ref,
  };

  if (select) {
    return (
      <NativeSelect {...shared} data={rest.data}>
        {children}
      </NativeSelect>
    );
  }

  if (multiline) {
    return <Textarea {...shared} minRows={rows || 3} />;
  }

  return <TextInput {...shared} type={rest.type} {...(inputProps || {})} />;
}
