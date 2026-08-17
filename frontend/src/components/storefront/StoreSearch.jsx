import { useEffect, useId, useRef, useState } from 'react';
import {
  Box, TextField, InputAdornment, IconButton, Paper, Typography, Stack, CircularProgress, alpha,
} from '@mui/material';
import { Search, Close } from '@mui/icons-material';
import { ProductThumb } from './ProductImage';
import useStoreCurrency from '../../hooks/useStoreCurrency';
import { SF } from './storefrontTheme';

/**
 * Header search with results dropdown, empty state, and keyboard navigation.
 */
export default function StoreSearch({
  value,
  onChange,
  onSubmit,
  onSelectResult,
  results = [],
  loading = false,
  primaryColor,
  placeholder = 'Search menu…',
  fullWidth = true,
}) {
  const { formatMoney } = useStoreCurrency();
  const listId = useId();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const q = (value || '').trim();
  const showPanel = open && q.length >= 2;

  useEffect(() => {
    setHighlight(-1);
  }, [results, q]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const submit = () => {
    setOpen(false);
    onSubmit?.();
  };

  const pick = (product) => {
    setOpen(false);
    onSelectResult?.(product);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showPanel && highlight >= 0 && results[highlight]) {
        pick(results[highlight]);
      } else {
        submit();
      }
      return;
    }
    if (!showPanel || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? results.length - 1 : h - 1));
    }
  };

  return (
    <Box ref={rootRef} sx={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
      <TextField
        size="small"
        fullWidth={fullWidth}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange?.(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        inputProps={{
          role: 'combobox',
          'aria-expanded': showPanel,
          'aria-controls': listId,
          'aria-autocomplete': 'list',
          'aria-activedescendant': highlight >= 0 ? `${listId}-opt-${highlight}` : undefined,
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ fontSize: 20, color: 'text.disabled' }} />
            </InputAdornment>
          ),
          endAdornment: value ? (
            <InputAdornment position="end">
              {loading ? (
                <CircularProgress size={16} sx={{ mr: 0.5 }} />
              ) : (
                <IconButton
                  size="small"
                  aria-label="Clear search"
                  onClick={() => {
                    onChange?.('');
                    setOpen(false);
                  }}
                  edge="end"
                  sx={{ mr: -0.5 }}
                >
                  <Close sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </InputAdornment>
          ) : null,
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: SF.colors.paperMuted,
            borderRadius: SF.radius.sm,
            height: 40,
            '& fieldset': { borderColor: 'transparent' },
            '&:hover fieldset': { borderColor: SF.colors.border },
            '&.Mui-focused fieldset': { borderColor: alpha(primaryColor, 0.45) },
          },
          '& input': { py: 1, fontSize: 14 },
        }}
      />

      {showPanel && (
        <Paper
          elevation={0}
          id={listId}
          role="listbox"
          sx={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: (t) => t.zIndex.modal,
            borderRadius: SF.radius.md,
            border: '1px solid',
            borderColor: SF.colors.border,
            boxShadow: '0 12px 32px rgba(15,23,42,0.12)',
            overflow: 'hidden',
            maxHeight: 360,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loading && results.length === 0 ? (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <CircularProgress size={22} />
            </Box>
          ) : results.length === 0 ? (
            <Box sx={{ px: 2, py: 2.5, textAlign: 'center' }}>
              <Typography fontWeight={600} sx={{ fontSize: 14 }}>No matches</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: 13 }}>
                Try another name or browse the menu.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ overflowY: 'auto', py: 0.5 }}>
              {results.map((p, i) => {
                const active = i === highlight;
                const out = Number(p.stock_quantity) <= 0;
                return (
                  <Box
                    key={p.id}
                    id={`${listId}-opt-${i}`}
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setHighlight(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(p)}
                    sx={{
                      px: 1.5,
                      py: 1,
                      cursor: 'pointer',
                      bgcolor: active ? alpha(primaryColor, 0.08) : 'transparent',
                      '&:hover': { bgcolor: alpha(primaryColor, 0.08) },
                    }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <ProductThumb product={p} alt={p.name} size={40} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap fontWeight={600} sx={{ fontSize: 13.5, lineHeight: 1.3 }}>
                          {p.name}
                        </Typography>
                        <Typography variant="caption" color={out ? 'text.disabled' : 'text.secondary'}>
                          {out ? 'Sold out' : (p.category_name || 'Menu')}
                        </Typography>
                      </Box>
                      <Typography fontWeight={700} sx={{ fontSize: 13, flexShrink: 0 }}>
                        {formatMoney(p.sale_price)}
                      </Typography>
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          )}
          <Box
            sx={{
              px: 1.5,
              py: 1,
              borderTop: '1px solid',
              borderColor: SF.colors.borderSubtle,
              bgcolor: SF.colors.paperMuted,
            }}
          >
            <Typography
              component="button"
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={submit}
              sx={{
                border: 0,
                bgcolor: 'transparent',
                p: 0,
                cursor: 'pointer',
                font: 'inherit',
                fontSize: 12.5,
                fontWeight: 650,
                color: primaryColor,
                width: '100%',
                textAlign: 'left',
              }}
            >
              {results.length ? `See all results for “${q}”` : `Search “${q}”`}
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
