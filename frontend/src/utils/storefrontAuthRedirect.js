/**
 * Safe in-store return path after storefront login.
 * Only allows paths under the current store basePath.
 */
export function resolveStoreReturnPath(basePath, candidate, fallback = null) {
  const shopFallback = fallback || `${basePath}/shop`;
  if (!candidate || typeof candidate !== 'string') return shopFallback;

  let path = candidate.trim();
  try {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const url = new URL(path);
      path = `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return shopFallback;
  }

  if (!path.startsWith('/')) path = `/${path}`;

  const accountPath = `${basePath}/account`;
  if (path === accountPath || path.startsWith(`${accountPath}?`) || path.startsWith(`${accountPath}/`)) {
    return shopFallback;
  }

  if (path === basePath || path.startsWith(`${basePath}/`)) {
    return path;
  }

  return shopFallback;
}

/** Build /store/{slug}/account?return=... for post-login redirect */
export function storeAccountLoginPath(basePath, returnTo) {
  if (!returnTo || typeof returnTo !== 'string') return `${basePath}/account`;

  let path = returnTo.trim();
  try {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const url = new URL(path);
      path = `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return `${basePath}/account`;
  }
  if (!path.startsWith('/')) path = `/${path}`;

  const accountPath = `${basePath}/account`;
  if (
    path === accountPath
    || path.startsWith(`${accountPath}?`)
    || path.startsWith(`${accountPath}/`)
    || !(path === basePath || path.startsWith(`${basePath}/`))
  ) {
    return `${basePath}/account`;
  }

  return `${basePath}/account?${new URLSearchParams({ return: path }).toString()}`;
}
