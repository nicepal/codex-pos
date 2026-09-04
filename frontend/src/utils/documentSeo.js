/**
 * Document head helpers for SPA storefront SEO / social previews.
 * Crawlers that execute JS (Google) pick these up; share buttons still help
 * platforms that do not run client JS.
 */

function ensureMeta(attr, key, content) {
  if (content == null || content === '') return null;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  const created = !el;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  const prev = el.getAttribute('content');
  el.setAttribute('content', String(content).slice(0, 300));
  return { el, prev, created };
}

function ensureLink(rel, href) {
  if (!href) return null;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  const created = !el;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  const prev = el.getAttribute('href');
  el.setAttribute('href', href);
  return { el, prev, created };
}

function ensureJsonLd(id, data) {
  const scriptId = `jsonld-${id}`;
  let el = document.getElementById(scriptId);
  const created = !el;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = scriptId;
    document.head.appendChild(el);
  }
  const prev = el.textContent;
  el.textContent = JSON.stringify(data);
  return { el, prev, created };
}

export function toAbsoluteUrl(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return undefined;
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (typeof window === 'undefined') return trimmed;
  try {
    return new URL(trimmed.startsWith('/') ? trimmed : `/${trimmed}`, window.location.origin).href;
  } catch {
    return trimmed;
  }
}

/**
 * Apply title, description, Open Graph, Twitter, canonical, and optional JSON-LD.
 * Returns a cleanup function that restores previous values.
 */
export function applyDocumentSeo({
  title,
  description,
  image,
  url,
  type = 'website',
  siteName,
  jsonLdId,
  jsonLd,
}) {
  if (typeof document === 'undefined') return () => {};

  const prevTitle = document.title;
  if (title) document.title = title;

  const absUrl = toAbsoluteUrl(url) || (typeof window !== 'undefined' ? window.location.href : undefined);
  const absImage = toAbsoluteUrl(image);
  const desc = description ? String(description).replace(/\s+/g, ' ').trim().slice(0, 160) : undefined;

  const snapshots = [
    ensureMeta('name', 'description', desc),
    ensureMeta('property', 'og:title', title),
    ensureMeta('property', 'og:description', desc),
    ensureMeta('property', 'og:type', type),
    ensureMeta('property', 'og:url', absUrl),
    ensureMeta('property', 'og:image', absImage),
    ensureMeta('property', 'og:image:alt', title),
    ensureMeta('property', 'og:site_name', siteName),
    ensureMeta('property', 'og:locale', 'en_US'),
    ensureMeta('name', 'twitter:card', absImage ? 'summary_large_image' : 'summary'),
    ensureMeta('name', 'twitter:title', title),
    ensureMeta('name', 'twitter:description', desc),
    ensureMeta('name', 'twitter:image', absImage),
    ensureMeta('name', 'twitter:image:alt', title),
    ensureLink('canonical', absUrl),
  ].filter(Boolean);

  let jsonSnapshot = null;
  if (jsonLdId && jsonLd) {
    jsonSnapshot = ensureJsonLd(jsonLdId, jsonLd);
  }

  return () => {
    document.title = prevTitle;
    snapshots.forEach(({ el, prev, created }) => {
      if (created) el.remove();
      else if (prev != null) el.setAttribute(el.hasAttribute('content') ? 'content' : 'href', prev);
      else if (el.hasAttribute('content')) el.removeAttribute('content');
      else if (el.hasAttribute('href')) el.removeAttribute('href');
    });
    if (jsonSnapshot) {
      if (jsonSnapshot.created) jsonSnapshot.el.remove();
      else jsonSnapshot.el.textContent = jsonSnapshot.prev || '';
    }
  };
}
