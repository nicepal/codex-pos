import { useEffect, useRef, useState } from 'react';
import { Box, ButtonBase, alpha } from '@mui/material';
import { SF } from './storefrontTheme';

/**
 * Compact sticky horizontal category chips.
 */
export default function CategoryNavigation({
  categories = [],
  activeSlug = '',
  onSelect,
  primaryColor,
  sticky = true,
  stickyTop = 0,
  showAll = true,
  allLabel = 'All',
}) {
  const scrollerRef = useRef(null);
  const activeRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollAffordance = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(max > 4 && el.scrollLeft < max - 4);
  };

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeSlug]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    updateScrollAffordance();
    el.addEventListener('scroll', updateScrollAffordance, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollAffordance) : null;
    ro?.observe(el);
    window.addEventListener('resize', updateScrollAffordance);
    return () => {
      el.removeEventListener('scroll', updateScrollAffordance);
      ro?.disconnect();
      window.removeEventListener('resize', updateScrollAffordance);
    };
  }, [categories]);

  if (!categories.length) return null;

  const items = showAll
    ? [{ id: '__all', slug: '', name: allLabel }, ...categories]
    : categories;

  return (
    <Box
      sx={{
        position: sticky ? 'sticky' : 'relative',
        top: stickyTop,
        zIndex: (t) => t.zIndex.appBar - 1,
        bgcolor: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid',
        borderColor: 'var(--store-border, ' + SF.colors.border + ')',
        mb: 0.5,
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <Box
          aria-hidden
          sx={{
            pointerEvents: 'none',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 24,
            zIndex: 1,
            opacity: canScrollLeft ? 1 : 0,
            background: 'linear-gradient(90deg, #fff 0%, rgba(255,255,255,0) 100%)',
          }}
        />
        <Box
          aria-hidden
          sx={{
            pointerEvents: 'none',
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 24,
            zIndex: 1,
            opacity: canScrollRight ? 1 : 0,
            background: 'linear-gradient(270deg, #fff 0%, rgba(255,255,255,0) 100%)',
          }}
        />

        <Box
          ref={scrollerRef}
          role="tablist"
          aria-label="Categories"
          sx={{
            display: 'flex',
            gap: 0.5,
            overflowX: 'auto',
            py: 0.85,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {items.map((c) => {
            const isActive = (c.slug || '') === (activeSlug || '');
            return (
              <ButtonBase
                key={c.id}
                ref={isActive ? activeRef : undefined}
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect?.(c.slug || '')}
                sx={{
                  flexShrink: 0,
                  px: 1.25,
                  py: 0.45,
                  minHeight: 30,
                  borderRadius: `${SF.radius.sm}px`,
                  fontSize: 12.5,
                  fontWeight: isActive ? 700 : 550,
                  letterSpacing: '-0.01em',
                  color: isActive ? '#fff' : SF.colors.textMuted,
                  bgcolor: isActive ? 'var(--store-primary, ' + primaryColor + ')' : SF.colors.paper,
                  border: '1px solid',
                  borderColor: isActive ? 'var(--store-primary, ' + primaryColor + ')' : SF.colors.border,
                  '&:hover': {
                    bgcolor: isActive ? 'var(--store-primary, ' + primaryColor + ')' : alpha(primaryColor, 0.06),
                    color: isActive ? '#fff' : SF.colors.text,
                    borderColor: isActive ? 'var(--store-primary, ' + primaryColor + ')' : alpha(primaryColor, 0.35),
                  },
                }}
              >
                {c.name}
              </ButtonBase>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
