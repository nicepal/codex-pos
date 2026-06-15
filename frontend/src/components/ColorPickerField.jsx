import { Box, TextField, InputAdornment } from '@mui/material';

const HEX_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function toPickerValue(value, fallback = '#2563eb') {
  if (!value || typeof value !== 'string') return fallback;
  const v = value.startsWith('#') ? value : `#${value}`;
  return HEX_REGEX.test(v) ? v : fallback;
}

export default function ColorPickerField({
  label,
  value,
  onChange,
  helperText,
  fallback = '#2563eb',
}) {
  const pickerValue = toPickerValue(value, fallback);

  return (
    <TextField
      fullWidth
      label={label}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      helperText={helperText}
      placeholder={fallback}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Box
              component="input"
              type="color"
              value={pickerValue}
              onChange={(e) => onChange(e.target.value)}
              sx={{
                width: 40,
                height: 40,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                cursor: 'pointer',
                p: 0,
                bgcolor: 'transparent',
              }}
            />
          </InputAdornment>
        ),
      }}
    />
  );
}
