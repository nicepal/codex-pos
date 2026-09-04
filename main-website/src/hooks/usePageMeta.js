import { useEffect } from 'react';
import { SITE_URL, site } from '../data/site';

/**
 * Lightweight per-page SEO (title, description, canonical, OG/Twitter).
 */
export function usePageMeta({
  title,
  description,
  path = '/',
  type = 'website',
  image = `${SITE_URL}/og-default.svg`,
}) {
  useEffect(() => {
    const fullTitle = title.includes('PosHive') ? title : `${title} · PosHive`;
    document.title = fullTitle;

    const canonical = `${SITE_URL}${path === '/' ? '' : path}`;

    const setMeta = (selector, attr, value) => {
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement(selector.startsWith('meta') ? 'meta' : 'link');
        if (selector.includes('[name=')) {
          el.setAttribute('name', selector.match(/name="([^"]+)"/)[1]);
        } else if (selector.includes('[property=')) {
          el.setAttribute('property', selector.match(/property="([^"]+)"/)[1]);
        } else if (selector.includes('[rel=')) {
          el.setAttribute('rel', selector.match(/rel="([^"]+)"/)[1]);
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', 'content', description);
    setMeta('link[rel="canonical"]', 'href', canonical);

    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', canonical);
    setMeta('meta[property="og:type"]', 'content', type);
    setMeta('meta[property="og:image"]', 'content', image);
    setMeta('meta[property="og:site_name"]', 'content', site.name);

    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'content', fullTitle);
    setMeta('meta[name="twitter:description"]', 'content', description);
    setMeta('meta[name="twitter:image"]', 'content', image);
  }, [title, description, path, type, image]);
}
