/** Allow a small safe HTML subset for product descriptions on the storefront. */
export function sanitizeRichTextHtml(value) {
  if (value == null) return '';
  let html = String(value).trim();
  if (!html) return '';

  // Drop scripts/styles and event handlers
  html = html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '$1="#"');

  // Keep only a conservative tag set
  html = html.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (match, tag) => {
    const allowed = new Set([
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a', 'span', 'div',
    ]);
    const name = String(tag).toLowerCase();
    if (!allowed.has(name)) return '';
    if (name === 'br') return '<br />';
    if (match.startsWith('</')) return `</${name}>`;
    if (name === 'a') {
      const hrefMatch = match.match(/href\s*=\s*(['"])(.*?)\1/i);
      const href = hrefMatch?.[2]?.trim() || '';
      if (!href || /^javascript:/i.test(href)) return '<a>';
      const safe = href.replace(/"/g, '&quot;');
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer">`;
    }
    return `<${name}>`;
  });

  return html.trim();
}

/** True when value looks like HTML markup rather than plain text. */
export function looksLikeHtml(value) {
  if (value == null) return false;
  return /<\/?[a-z][\s\S]*>/i.test(String(value));
}
