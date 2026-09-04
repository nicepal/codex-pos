const db = require('../../config/database');
const config = require('../../config');
const { toStorefrontMediaUrl } = require('../../services/upload.service');
const checkoutService = require('./storefront.checkout.service');
const storefrontService = require('./storefront.service');

const DEFAULT_OG_PATH = '/og-store-default.png';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripText(value, max = 160) {
  if (value == null) return '';
  const text = String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, max);
}

function requestOrigin(req) {
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
  const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  if (host) return `${proto}://${host}`;
  return (config.app.url || 'https://app.poshive.store').replace(/\/$/, '');
}

function toAbsolute(origin, pathOrUrl) {
  if (!pathOrUrl) return null;
  const trimmed = String(pathOrUrl).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${origin}${path}`;
}

async function loadTenantBySlug(slug) {
  const result = await db.query(
    `SELECT * FROM tenants WHERE slug = $1 AND status NOT IN ('deleted', 'suspended') LIMIT 1`,
    [slug]
  );
  return result.rows[0] || null;
}

function buildShopDescription(store, theme) {
  const themeSettings = theme?.theme || {};
  return (
    stripText(themeSettings.banner_text)
    || stripText(themeSettings.tagline)
    || stripText(themeSettings.announcement_text)
    || stripText(store.address)
    || `Shop ${store.name} online — browse products and order on PosHive.`
  );
}

function renderOgHtml({
  title,
  description,
  url,
  image,
  siteName,
  type = 'website',
  jsonLd,
}) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeUrl = escapeHtml(url);
  const safeImage = escapeHtml(image);
  const safeSite = escapeHtml(siteName || 'PosHive');
  const json = jsonLd ? JSON.stringify(jsonLd).replace(/</g, '\\u003c') : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />
  <link rel="canonical" href="${safeUrl}" />
  <meta property="og:type" content="${escapeHtml(type)}" />
  <meta property="og:site_name" content="${safeSite}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:alt" content="${safeTitle}" />
  <meta property="og:locale" content="en_US" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeImage}" />
  ${json ? `<script type="application/ld+json">${json}</script>` : ''}
</head>
<body>
  <p>${safeTitle}</p>
  <p>${safeDesc}</p>
  <p><a href="${safeUrl}">View shop</a></p>
</body>
</html>`;
}

async function buildShopOg(req, slug) {
  const tenant = await loadTenantBySlug(slug);
  if (!tenant) return null;

  const origin = requestOrigin(req);
  const [store, theme] = await Promise.all([
    storefrontService.getStoreInfo(tenant),
    checkoutService.getTheme(tenant.id),
  ]);

  const storeName = theme?.name || store.name || 'Store';
  const description = buildShopDescription(store, theme);
  const logo = toStorefrontMediaUrl(theme?.logo_url || store.logo_url);
  const image = toAbsolute(origin, logo) || toAbsolute(origin, DEFAULT_OG_PATH);
  const url = `${origin}/store/${encodeURIComponent(slug)}`;
  const title = `${storeName} — Order Online`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: storeName,
    description,
    url,
    image,
    telephone: store.phone || undefined,
    email: store.email || undefined,
    address: store.address
      ? { '@type': 'PostalAddress', streetAddress: store.address }
      : undefined,
    brand: { '@type': 'Brand', name: 'PosHive' },
  };

  return renderOgHtml({
    title,
    description,
    url,
    image,
    siteName: storeName,
    type: 'website',
    jsonLd,
  });
}

async function buildProductOg(req, slug, productSlug) {
  const tenant = await loadTenantBySlug(slug);
  if (!tenant) return null;

  const origin = requestOrigin(req);
  const [store, theme, product] = await Promise.all([
    storefrontService.getStoreInfo(tenant),
    checkoutService.getTheme(tenant.id),
    storefrontService.getProduct(tenant.id, productSlug),
  ]);
  if (!product) return null;

  const storeName = theme?.name || store.name || 'Store';
  const description = stripText(product.description)
    || `${product.name} available at ${storeName}. Order online.`;
  const productImage = toStorefrontMediaUrl(
    product.images?.find((i) => i.is_primary)?.url
      || product.images?.[0]?.url
      || product.image_url
  );
  const logo = toStorefrontMediaUrl(theme?.logo_url || store.logo_url);
  const image = toAbsolute(origin, productImage)
    || toAbsolute(origin, logo)
    || toAbsolute(origin, DEFAULT_OG_PATH);
  const url = `${origin}/store/${encodeURIComponent(slug)}/product/${encodeURIComponent(productSlug)}`;
  const title = `${product.name} | ${storeName}`;
  const price = parseFloat(product.sale_price);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description,
    image: image ? [image] : undefined,
    sku: product.sku || undefined,
    url,
    brand: { '@type': 'Brand', name: storeName },
    offers: Number.isFinite(price)
      ? {
        '@type': 'Offer',
        priceCurrency: store.currency || 'USD',
        price: price.toFixed(2),
        availability: Number(product.stock_quantity) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        url,
      }
      : undefined,
  };

  return renderOgHtml({
    title,
    description,
    url,
    image,
    siteName: storeName,
    type: 'product',
    jsonLd,
  });
}

module.exports = {
  DEFAULT_OG_PATH,
  buildShopOg,
  buildProductOg,
};
