import { useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, IconButton, Tooltip, Divider, Stack,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  FormatClear,
  Link as LinkIcon,
} from '@mui/icons-material';

function runCommand(command, value = null) {
  document.execCommand(command, false, value);
}

/**
 * Lightweight rich-text editor (stores HTML). No extra npm deps.
 * Use with react-hook-form via RHFRichTextEditor or value/onChange.
 */
export default function RichTextEditor({
  label = 'Description',
  value = '',
  onChange,
  onBlur,
  error,
  minHeight = 120,
  placeholder = 'Write a product description…',
  disabled = false,
}) {
  const ref = useRef(null);
  const lastHtml = useRef('');

  const emitChange = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const html = el.innerHTML === '<br>' ? '' : el.innerHTML;
    if (html === lastHtml.current) return;
    lastHtml.current = html;
    onChange?.(html);
  }, [onChange]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = value || '';
    if (next !== lastHtml.current && next !== el.innerHTML) {
      el.innerHTML = next;
      lastHtml.current = next;
    }
  }, [value]);

  const apply = (command) => {
    if (disabled) return;
    ref.current?.focus();
    if (command === 'createLink') {
      const url = window.prompt('Enter link URL', 'https://');
      if (!url) return;
      runCommand('createLink', url);
    } else {
      runCommand(command);
    }
    emitChange();
  };

  const tools = [
    { label: 'Bold', icon: FormatBold, command: 'bold' },
    { label: 'Italic', icon: FormatItalic, command: 'italic' },
    { label: 'Underline', icon: FormatUnderlined, command: 'underline' },
    { divider: true },
    { label: 'Bulleted list', icon: FormatListBulleted, command: 'insertUnorderedList' },
    { label: 'Numbered list', icon: FormatListNumbered, command: 'insertOrderedList' },
    { divider: true },
    { label: 'Insert link', icon: LinkIcon, command: 'createLink' },
    { label: 'Clear formatting', icon: FormatClear, command: 'removeFormat' },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {label ? (
        <Typography
          component="label"
          variant="body2"
          sx={{ display: 'block', mb: 0.75, fontWeight: 500 }}
        >
          {label}
        </Typography>
      ) : null}

      <Box
        sx={{
          border: '1px solid',
          borderColor: error ? 'error.main' : 'divider',
          borderRadius: 1,
          bgcolor: disabled ? 'action.hover' : 'background.paper',
          overflow: 'hidden',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.25}
          sx={{
            px: 0.75,
            py: 0.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover',
            flexWrap: 'wrap',
          }}
        >
          {tools.map((tool, i) => (
            tool.divider ? (
              <Divider key={`d-${i}`} orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
            ) : (
              <Tooltip key={tool.label} title={tool.label}>
                <span>
                  <IconButton
                    size="small"
                    disabled={disabled}
                    aria-label={tool.label}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => apply(tool.command)}
                  >
                    <tool.icon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )
          ))}
        </Stack>

        <Box
          component="div"
          ref={ref}
          role="textbox"
          aria-multiline="true"
          aria-label={label || 'Rich text editor'}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={emitChange}
          onBlur={() => {
            emitChange();
            onBlur?.();
          }}
          data-placeholder={placeholder}
          sx={{
            minHeight,
            px: 1.5,
            py: 1.25,
            outline: 'none',
            fontSize: 14,
            lineHeight: 1.55,
            cursor: disabled ? 'not-allowed' : 'text',
            '&:empty:before': {
              content: 'attr(data-placeholder)',
              color: 'text.disabled',
              pointerEvents: 'none',
            },
            '& p': { m: '0 0 0.5em' },
            '& ul, & ol': { m: '0.25em 0 0.5em', pl: '1.25em' },
            '& a': { color: 'primary.main' },
          }}
        />
      </Box>

      {error ? (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
          {error}
        </Typography>
      ) : null}
    </Box>
  );
}
