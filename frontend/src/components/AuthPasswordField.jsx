import { useState } from 'react';
import { IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import RHFTextField from './RHFTextField';

export default function AuthPasswordField({ register, name = 'password', rules, label = 'Password', helperText, ...rest }) {
  const [show, setShow] = useState(false);

  return (
    <RHFTextField
      register={register}
      name={name}
      rules={rules}
      label={label}
      type={show ? 'text' : 'password'}
      helperText={helperText}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              aria-label={show ? 'Hide password' : 'Show password'}
              onClick={() => setShow((v) => !v)}
              edge="end"
              size="small"
            >
              {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
      {...rest}
    />
  );
}
