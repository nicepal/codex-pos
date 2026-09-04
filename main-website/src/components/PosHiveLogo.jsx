import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './PosHiveLogo.css';

const BRAND = '/assets/images/branding';

const SIZES = {
  sm: { icon: 28, height: 28 },
  md: { icon: 36, height: 36 },
  lg: { icon: 44, height: 44 },
};

function useIsMobile(breakpoint = 960) {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpoint]);
  return mobile;
}

/**
 * Official PosHive.store brand lockup.
 * @param {'light'|'dark'} variant — light = for light backgrounds; dark = for dark backgrounds
 * @param {'sm'|'md'|'lg'} size
 * @param {boolean} link
 * @param {boolean} markOnly — force icon-only
 * @param {boolean} preferIconOnMobile — navbar: icon on small screens, full lockup on desktop
 */
export default function PosHiveLogo({
  variant = 'light',
  size = 'md',
  link = true,
  markOnly = false,
  preferIconOnMobile = false,
  className = '',
}) {
  const isMobile = useIsMobile();
  const dims = SIZES[size] || SIZES.md;
  const useIcon = markOnly || (preferIconOnMobile && isMobile);

  const iconSrc = variant === 'dark'
    ? `${BRAND}/poshive-icon-dark.svg`
    : `${BRAND}/poshive-icon.svg`;

  const logoSrc = variant === 'dark'
    ? `${BRAND}/poshive-logo-dark.svg`
    : `${BRAND}/poshive-logo-light.svg`;

  const content = useIcon ? (
    <span className={`poshive-logo poshive-logo--${variant} poshive-logo--${size} ${className}`.trim()}>
      <img
        src={iconSrc}
        alt=""
        width={dims.icon}
        height={dims.icon}
        className="poshive-logo-mark"
        decoding="async"
      />
    </span>
  ) : (
    <span className={`poshive-logo poshive-logo--lockup poshive-logo--${variant} poshive-logo--${size} ${className}`.trim()}>
      <img
        src={logoSrc}
        alt="PosHive.store"
        height={dims.height}
        className="poshive-logo-lockup"
        decoding="async"
      />
    </span>
  );

  if (!link) return content;
  return (
    <Link to="/" className="poshive-logo-link" aria-label="PosHive.store home">
      {content}
    </Link>
  );
}
