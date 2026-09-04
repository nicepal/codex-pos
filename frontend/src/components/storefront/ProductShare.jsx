import { useState } from 'react';
import {
  Box, IconButton, Stack, Tooltip, Snackbar, Typography, alpha,
} from '@mui/material';
import {
  ShareOutlined, LinkOutlined, WhatsApp, Facebook, Twitter,
} from '@mui/icons-material';
import { SF } from './storefrontTheme';

function buildShareText({ productName, storeName, priceLabel }) {
  const bits = [productName];
  if (priceLabel) bits.push(priceLabel);
  if (storeName) bits.push(`from ${storeName}`);
  return bits.filter(Boolean).join(' — ');
}

/**
 * Social share actions for a product detail page.
 */
export default function ProductShare({
  url,
  productName,
  storeName,
  priceLabel,
  primaryColor = '#2563eb',
  description,
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const text = buildShareText({ productName, storeName, priceLabel });
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(text);
  const encodedDesc = encodeURIComponent(description || text);

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: productName,
        text: description || text,
        url: shareUrl,
      });
    } catch {
      /* user cancelled */
    }
  };

  const btnSx = {
    width: 40,
    height: 40,
    borderRadius: `${SF.radius.sm}px`,
    border: '1px solid',
    borderColor: SF.colors.border,
    bgcolor: SF.colors.paper,
    color: SF.colors.textMuted,
    '&:hover': {
      bgcolor: alpha(primaryColor, 0.08),
      color: primaryColor,
      borderColor: alpha(primaryColor, 0.35),
    },
  };

  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mb: 0.75,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          fontSize: 11,
        }}
      >
        Share
      </Typography>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {canNativeShare && (
          <Tooltip title="Share">
            <IconButton aria-label="Share product" onClick={handleNativeShare} sx={btnSx}>
              <ShareOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Copy link">
          <IconButton aria-label="Copy product link" onClick={handleCopy} sx={btnSx}>
            <LinkOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="WhatsApp">
          <IconButton
            aria-label="Share on WhatsApp"
            component="a"
            href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={btnSx}
          >
            <WhatsApp fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Facebook">
          <IconButton
            aria-label="Share on Facebook"
            component="a"
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedDesc}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={btnSx}
          >
            <Facebook fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="X / Twitter">
          <IconButton
            aria-label="Share on X"
            component="a"
            href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={btnSx}
          >
            <Twitter fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Link copied"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
