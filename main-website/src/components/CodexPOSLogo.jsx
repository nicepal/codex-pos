import { Link } from 'react-router-dom';
import './CodexPOSLogo.css';

const SIZES = {
  sm: { mark: 28, word: 16 },
  md: { mark: 36, word: 20 },
  lg: { mark: 44, word: 24 },
};

function Mark({ size, variant }) {
  const ring = variant === 'dark' ? '#0B1F2A' : '#14B8A6';
  const tile = variant === 'dark' ? '#14B8A6' : '#0B1F2A';
  const glyph = variant === 'dark' ? '#0B1F2A' : '#F5B942';

  return (
    <svg
      className="codexpos-logo-mark"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="16" fill={tile} />
      <path
        d="M44.5 20.2C41.2 16.6 36.4 14.5 31.2 14.5c-10.2 0-18.5 8.3-18.5 18.5s8.3 18.5 18.5 18.5c5.2 0 10-2.1 13.3-5.7"
        stroke={ring}
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M30 24.5h8.5v4.2H34.2v3.1H38v4.2h-8V24.5z" fill={glyph} />
      <path d="M38.8 36.8h9.2v4.5H34.5v-12.2h4.3v7.7z" fill={glyph} />
    </svg>
  );
}

/**
 * Official CodexPOS brand lockup.
 * @param {'light'|'dark'} variant
 * @param {'sm'|'md'|'lg'} size
 * @param {boolean} link — wrap in home Link (default true)
 * @param {boolean} markOnly — hide wordmark
 */
export default function CodexPOSLogo({
  variant = 'light',
  size = 'md',
  link = true,
  markOnly = false,
  className = '',
}) {
  const dims = SIZES[size] || SIZES.md;
  const content = (
    <span className={`codexpos-logo codexpos-logo--${variant} codexpos-logo--${size} ${className}`.trim()}>
      <Mark size={dims.mark} variant={variant} />
      {!markOnly && (
        <svg
          className="codexpos-logo-word"
          viewBox="0 0 168 28"
          height={dims.word}
          aria-hidden="true"
          focusable="false"
        >
          <text
            x="0"
            y="22"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="24"
            fontWeight="700"
            letterSpacing="-0.04em"
            fill="currentColor"
          >
            CodexPOS
          </text>
        </svg>
      )}
    </span>
  );

  if (!link) return content;
  return (
    <Link to="/" className="codexpos-logo-link" aria-label="CodexPOS home">
      {content}
    </Link>
  );
}
