import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Stack } from '@mui/material';
import { CloudUpload, ContentPaste, PermMedia } from '@mui/icons-material';

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;

function isImageFile(file) {
  if (!file) return false;
  if (file.type && ACCEPT.split(',').includes(file.type)) return true;
  return /\.(jpe?g|png|gif|webp)$/i.test(file.name || '');
}

function fileFromClipboardItem(item) {
  if (!item || item.kind !== 'file') return null;
  const file = item.getAsFile();
  return isImageFile(file) ? file : null;
}

/**
 * Product image dropzone: click, drag-and-drop, or Ctrl/Cmd+V paste.
 * @param {(files: File[]) => void | Promise<void>} onUpload
 */
export default function ProductImageUploader({
  onUpload,
  uploading = false,
  disabled = false,
  error = '',
  active = true,
}) {
  const inputRef = useRef(null);
  const zoneRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState('');

  const busy = uploading || disabled;

  const processFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []).filter(isImageFile);
      if (!files.length) {
        setLocalError('Please choose a JPEG, PNG, GIF, or WebP image.');
        return;
      }
      const tooBig = files.find((f) => f.size > MAX_BYTES);
      if (tooBig) {
        setLocalError(`"${tooBig.name}" is over 5 MB. Choose a smaller image.`);
        return;
      }
      setLocalError('');
      await onUpload?.(files);
    },
    [onUpload]
  );

  useEffect(() => {
    if (!active || busy) return undefined;

    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items?.length) return;
      const files = [];
      for (const item of items) {
        const file = fileFromClipboardItem(item);
        if (file) files.push(file);
      }
      if (!files.length) return;
      e.preventDefault();
      processFiles(files);
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [active, busy, processFiles]);

  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!busy) setDragOver(true);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!busy) setDragOver(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === zoneRef.current) setDragOver(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (busy) return;
    processFiles(e.dataTransfer?.files);
  };

  const displayError = localError || error;

  return (
    <Box sx={{ mb: 2.5 }}>
      <Box
        ref={zoneRef}
        role="button"
        tabIndex={0}
        aria-label="Upload product images. Drop files, click to browse, or paste from clipboard."
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (busy) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        sx={{
          position: 'relative',
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'divider',
          bgcolor: dragOver ? 'action.hover' : 'grey.50',
          borderRadius: 2,
          px: { xs: 2, sm: 3 },
          py: { xs: 3, sm: 4 },
          textAlign: 'center',
          cursor: busy ? 'wait' : 'pointer',
          outline: 'none',
          transition: 'border-color 0.15s ease, background-color 0.15s ease',
          '&:hover': busy
            ? undefined
            : { borderColor: 'primary.light', bgcolor: 'action.hover' },
          '&:focus-visible': {
            borderColor: 'primary.main',
            boxShadow: (t) => `0 0 0 3px ${t.palette.primary.main}33`,
          },
          opacity: busy && !uploading ? 0.65 : 1,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={ACCEPT}
          multiple
          disabled={busy}
          onChange={(e) => {
            processFiles(e.target.files);
            e.target.value = '';
          }}
        />

        {uploading ? (
          <Stack alignItems="center" spacing={1.5}>
            <CircularProgress size={36} />
            <Typography variant="body1" fontWeight={600}>
              Uploading…
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Keep this tab open until the upload finishes.
            </Typography>
          </Stack>
        ) : (
          <Stack alignItems="center" spacing={1.25}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: dragOver ? 'primary.main' : 'action.selected',
                color: dragOver ? 'primary.contrastText' : 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 0.5,
              }}
            >
              <CloudUpload sx={{ fontSize: 28 }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {dragOver ? 'Drop images to upload' : 'Drop images here, or click to browse'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
              JPEG, PNG, GIF, or WebP · up to 5 MB each · multiple files allowed
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ mt: 1, color: 'text.secondary' }}
              alignItems="center"
            >
              <Stack direction="row" spacing={0.75} alignItems="center">
                <PermMedia fontSize="small" />
                <Typography variant="caption">Select files</Typography>
              </Stack>
              <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>
                ·
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <ContentPaste fontSize="small" />
                <Typography variant="caption">
                  Paste with{' '}
                  <Box component="kbd" sx={{ fontFamily: 'inherit', fontWeight: 700 }}>
                    Ctrl
                  </Box>
                  {' + '}
                  <Box component="kbd" sx={{ fontFamily: 'inherit', fontWeight: 700 }}>
                    V
                  </Box>
                  {' (⌘V on Mac)'}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
        )}
      </Box>

      {displayError ? (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {displayError}
        </Typography>
      ) : null}
    </Box>
  );
}
