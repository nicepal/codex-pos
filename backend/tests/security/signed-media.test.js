const {
  signMediaPath,
  verifySignedMediaPath,
  isPublicCatalogPath,
} = require('../../src/services/upload.service');

describe('signed media URLs', () => {
  const relativePath = 'tenants/abc/products/test.jpg';

  test('signs and verifies a media path', () => {
    const { expires, sig } = signMediaPath(relativePath);
    expect(verifySignedMediaPath(relativePath, String(expires), sig)).toBe(true);
  });

  test('rejects tampered signatures', () => {
    const { expires, sig } = signMediaPath(relativePath);
    expect(verifySignedMediaPath(relativePath, String(expires), `${sig.slice(0, -1)}0`)).toBe(false);
  });

  test('allows legacy public catalog paths', () => {
    expect(isPublicCatalogPath('tenants/uuid/products/file.jpg')).toBe(true);
    expect(isPublicCatalogPath('tenants/uuid/logo/file.png')).toBe(true);
    expect(isPublicCatalogPath('general/secret.pdf')).toBe(false);
  });
});
