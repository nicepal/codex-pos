import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Restore scroll position on client-side navigations (including browser Back). */
export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const el = id ? document.getElementById(id) : null;
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, search, hash]);

  return null;
}
