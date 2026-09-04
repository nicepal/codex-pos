import { useState } from 'react';
import { TextField, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

/** MUI TextField with show/hide password toggle. */
export default function PasswordField({ InputProps, type: _ignored, ...rest }) {
  const [show, setShow] = useState(false);

  return (
    <TextField
      {...rest}
      type={show ? 'text' : 'password'}
      InputProps={{
        ...InputProps,
        endAdornment: (
          <>
            <InputAdornment position="end">
              <IconButton
                aria-label={show ? 'Hide password' : 'Show password'}
                onClick={() => setShow((v) => !v)}
                onMouseDown={(e) => e.preventDefault()}
                edge="end"
                size="small"
              >
                {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </InputAdornment>
            {InputProps?.endAdornment}
          </>
        ),
      }}
    />
  );
}
