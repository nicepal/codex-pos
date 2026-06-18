const readline = require('readline');
const config = require('../../../config');
const logger = require('../../../utils/logger');

const DEFAULT_API_VERSION = config.shopify.apiVersion || '2024-10';
const MAX_RETRIES = 5;

class ShopifyError extends Error {
  constructor(message, code = 'SHOPIFY_ERROR', statusCode = 502) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Normalize any user-supplied store reference to a clean myshopify host.
// Accepts: "store.myshopify.com", "https://store.myshopify.com/admin", "store"
function normalizeShopUrl(input) {
  if (!input) throw new ShopifyError('Store URL is required', 'INVALID_URL', 400);
  let host = String(input).trim().toLowerCase();
  host = host.replace(/^https?:\/\//, '');
  host = host.replace(/\/.*$/, '');
  host = host.replace(/\s+/g, '');
  if (!host) throw new ShopifyError('Store URL is invalid', 'INVALID_URL', 400);
  if (!host.includes('.')) {
    host = `${host}.myshopify.com`;
  }
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(host)) {
    throw new ShopifyError(
      'Store URL must be a valid myshopify.com domain (e.g. your-store.myshopify.com)',
      'INVALID_URL',
      400
    );
  }
  return host;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function graphql(shop, token, query, variables = {}, { apiVersion = DEFAULT_API_VERSION } = {}) {
  const url = `https://${shop}/admin/api/${apiVersion}/graphql.json`;
  let attempt = 0;

  while (true) {
    attempt += 1;
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
          Accept: 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch (err) {
      if (attempt <= MAX_RETRIES) {
        await sleep(1000 * attempt);
        continue;
      }
      throw new ShopifyError(`Network error contacting Shopify: ${err.message}`, 'NETWORK', 503);
    }

    if (res.status === 401 || res.status === 403) {
      throw new ShopifyError('Invalid access token or insufficient scopes', 'UNAUTHORIZED', 401);
    }
    if (res.status === 404) {
      throw new ShopifyError('Store not found. Check the store URL.', 'NOT_FOUND', 404);
    }
    if (res.status === 402) {
      throw new ShopifyError('Shopify store is frozen or unavailable (402).', 'STORE_FROZEN', 402);
    }
    if (res.status === 423) {
      throw new ShopifyError('Shopify store is locked (423).', 'STORE_LOCKED', 423);
    }
    if (res.status === 429 || res.status >= 500) {
      if (attempt <= MAX_RETRIES) {
        const retryAfter = parseFloat(res.headers.get('Retry-After')) || 2 ** attempt;
        await sleep(retryAfter * 1000);
        continue;
      }
      throw new ShopifyError('Shopify is throttling or unavailable. Try again later.', 'THROTTLED', 429);
    }

    let body;
    try {
      body = await res.json();
    } catch {
      throw new ShopifyError('Unexpected response from Shopify', 'BAD_RESPONSE', 502);
    }

    // Throttled at GraphQL level
    if (body.errors && body.errors.some((e) => (e.extensions && e.extensions.code) === 'THROTTLED')) {
      if (attempt <= MAX_RETRIES) {
        await sleep(2 ** attempt * 1000);
        continue;
      }
      throw new ShopifyError('Shopify query throttled. Try again later.', 'THROTTLED', 429);
    }

    if (body.errors && body.errors.length) {
      const msg = body.errors.map((e) => e.message).join('; ');
      throw new ShopifyError(`Shopify GraphQL error: ${msg}`, 'GRAPHQL_ERROR', 400);
    }

    return body.data;
  }
}

async function verifyConnection(shop, token, opts = {}) {
  const data = await graphql(
    shop,
    token,
    `query { shop { name myshopifyDomain primaryDomain { url } currencyCode } }`,
    {},
    opts
  );
  if (!data || !data.shop) {
    throw new ShopifyError('Could not verify Shopify store', 'VERIFY_FAILED', 502);
  }
  return data.shop;
}

// Build the export query body used inside the bulk operation.
function buildProductsQuery({ updatedAtMin } = {}) {
  const filter = updatedAtMin ? `(query: "updated_at:>=${updatedAtMin}")` : '';
  return `
    {
      products${filter} {
        edges {
          node {
            id
            handle
            title
            descriptionHtml
            vendor
            productType
            status
            tags
            updatedAt
            featuredImage { url altText }
            options { name position values }
            images {
              edges { node { url altText } }
            }
            collections {
              edges { node { id title handle } }
            }
            variants {
              edges {
                node {
                  id
                  title
                  sku
                  barcode
                  price
                  compareAtPrice
                  position
                  selectedOptions { name value }
                  inventoryQuantity
                  image { url altText }
                  inventoryItem { unitCost { amount } }
                }
              }
            }
          }
        }
      }
    }
  `;
}

// Kick off a bulk operation export of the catalog. Returns the bulk operation node.
async function startBulkProductExport(shop, token, { updatedAtMin, apiVersion } = {}) {
  const inner = buildProductsQuery({ updatedAtMin }).replace(/"/g, '\\"').replace(/\n/g, ' ');
  const mutation = `
    mutation {
      bulkOperationRunQuery(
        query: "${inner}"
      ) {
        bulkOperation { id status }
        userErrors { field message }
      }
    }
  `;
  const data = await graphql(shop, token, mutation, {}, { apiVersion });
  const result = data.bulkOperationRunQuery;
  if (result.userErrors && result.userErrors.length) {
    const msg = result.userErrors.map((e) => e.message).join('; ');
    // A bulk op is already running — surface a clear, retryable message.
    if (/already in progress|running/i.test(msg)) {
      throw new ShopifyError('A Shopify export is already running. Please wait and retry.', 'BULK_IN_PROGRESS', 409);
    }
    throw new ShopifyError(`Failed to start Shopify export: ${msg}`, 'BULK_START_FAILED', 400);
  }
  return result.bulkOperation;
}

async function getCurrentBulkOperation(shop, token, { apiVersion } = {}) {
  const data = await graphql(
    shop,
    token,
    `query {
      currentBulkOperation(type: QUERY) {
        id status errorCode objectCount url partialDataUrl
      }
    }`,
    {},
    { apiVersion }
  );
  return data.currentBulkOperation;
}

// Poll until the bulk operation completes/fails. Returns the final operation (with `url`).
async function pollBulkOperation(shop, token, { apiVersion, intervalMs = 3000, timeoutMs = 30 * 60 * 1000, onTick } = {}) {
  const start = Date.now();
  while (true) {
    const op = await getCurrentBulkOperation(shop, token, { apiVersion });
    if (!op) {
      throw new ShopifyError('Bulk operation disappeared', 'BULK_LOST', 502);
    }
    if (typeof onTick === 'function') {
      try { onTick(op); } catch (_) { /* ignore */ }
    }
    if (op.status === 'COMPLETED') {
      return op;
    }
    if (op.status === 'FAILED' || op.status === 'CANCELED' || op.errorCode) {
      throw new ShopifyError(`Shopify export failed (${op.errorCode || op.status})`, 'BULK_FAILED', 502);
    }
    if (Date.now() - start > timeoutMs) {
      throw new ShopifyError('Shopify export timed out', 'BULK_TIMEOUT', 504);
    }
    await sleep(intervalMs);
  }
}

// Stream a JSONL bulk export line-by-line and invoke handler per parsed object.
// Returns the number of lines processed. Memory-safe for large catalogs.
async function streamJsonl(url, handler) {
  if (!url) return 0;
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new ShopifyError('Failed to download Shopify export file', 'DOWNLOAD_FAILED', 502);
  }
  const rl = readline.createInterface({ input: nodeReadableFromWeb(res.body), crlfDelay: Infinity });
  let count = 0;
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj;
    try {
      obj = JSON.parse(trimmed);
    } catch (err) {
      logger.warn('Skipping malformed JSONL line from Shopify export', { error: err.message });
      continue;
    }
    count += 1;
    // eslint-disable-next-line no-await-in-loop
    await handler(obj);
  }
  return count;
}

// Convert a web ReadableStream (fetch body) into a Node readable stream.
function nodeReadableFromWeb(webStream) {
  const { Readable } = require('stream');
  if (typeof Readable.fromWeb === 'function') {
    return Readable.fromWeb(webStream);
  }
  // Fallback for older Node: manual reader bridge
  const reader = webStream.getReader();
  return new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) this.push(null);
        else this.push(Buffer.from(value));
      } catch (err) {
        this.destroy(err);
      }
    },
  });
}

module.exports = {
  ShopifyError,
  normalizeShopUrl,
  graphql,
  verifyConnection,
  startBulkProductExport,
  getCurrentBulkOperation,
  pollBulkOperation,
  streamJsonl,
  DEFAULT_API_VERSION,
};
