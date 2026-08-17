const API_PREFIX = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * Normalize stored image URLs so they load through the frontend origin/proxy.
 * Handles signed /api/v1/media/... paths, absolute API hosts, and relative upload paths.
 */
export function resolveImageUrl(url) {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // Protocol-relative
  if (trimmed.startsWith('//')) {
    try {
      return resolveImageUrl(`${window.location.protocol}${trimmed}`);
    } catch {
      return trimmed;
    }
  }

  // Already site-relative — preserve query string for signed media URLs
  if (trimmed.startsWith('/')) {
    return trimmed.split('#')[0];
  }

  // api/v1/media/... without leading slash
  if (/^api\/v1\//i.test(trimmed)) {
    return `/${trimmed.split('#')[0]}`;
  }

  try {
    const parsed = new URL(trimmed);
    // Same-origin or API host media → use path+query so Vite proxy serves it
    if (
      parsed.pathname.startsWith('/api/')
      || parsed.pathname.includes('/media/')
      || parsed.pathname.includes('/uploads/')
    ) {
      return `${parsed.pathname}${parsed.search}`;
    }
    // External CDN (S3, etc.)
    return trimmed;
  } catch {
    // Bare relative path like tenants/.../logo/x.png or uploads/...
    if (trimmed.startsWith('tenants/')) {
      return `${API_PREFIX}/media/${trimmed.split('?')[0]}`;
    }
    if (trimmed.startsWith('uploads/')) {
      return `/${trimmed.split('?')[0]}`;
    }
    return trimmed;
  }
}

/**
 * Resolve a product/logo image from common API field shapes.
 */
export function resolveProductImageSrc(source) {
  if (!source) return undefined;
  if (typeof source === 'string') return resolveImageUrl(source);

  const candidates = [
    source.image_url,
    source.image,
    source.thumbnail_url,
    source.thumbnail,
    source.logo_url,
    source.media?.url,
    source.images?.[0]?.url,
    typeof source.images?.[0] === 'string' ? source.images[0] : null,
  ];

  for (const candidate of candidates) {
    const resolved = resolveImageUrl(candidate);
    if (resolved) return resolved;
  }
  return undefined;
}
