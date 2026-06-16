import { TextField } from '@mui/material';

/**
 * Controller-based select/input with required (*) label when rules require a value.
 */
export default function RHFControllerField({
  field,
  fieldState,
  rules,
  required: requiredProp,
  ...textFieldProps
}) {
  const isRequired = requiredProp ?? Boolean(
    rules?.required === true
    || (typeof rules?.required === 'string' && rules.required.length > 0),
  );

  return (
    <TextField
      fullWidth
      required={isRequired}
      {...textFieldProps}
      {...field}
      error={!!fieldState?.error}
      helperText={fieldState?.error?.message}
    />
  );
}
