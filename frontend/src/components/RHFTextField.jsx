import { TextField } from '@mui/material';

/**
 * TextField wired to react-hook-form with automatic required (*) label when rules require a value.
 */
export default function RHFTextField({
  register,
  name,
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
      {...register(name, rules)}
    />
  );
}
