/** Normalize stored image URLs so they load through the frontend origin/proxy. */
export function resolveImageUrl(url) {
  if (!url) return undefined;
  if (url.startsWith('/')) return url;

  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith('/api/')) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // not a full URL
  }

  return url;
}
