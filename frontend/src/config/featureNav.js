/** Nav paths gated by feature pack keys */
export const NAV_FEATURE_MAP = {
  '/transfers': ['inventory_pro'],
  '/stock-take': ['inventory_pro'],
  '/purchase-orders': ['inventory_pro'],
  '/employees': ['staff_pro'],
  '/team': ['staff_pro'],
  '/drawer': ['staff_pro'],
  '/coupons': ['catalog_pro'],
};

export const SHOP_FEATURE = 'omnichannel';

export function isNavItemVisible(path, hasFeature) {
  const required = NAV_FEATURE_MAP[path];
  if (!required?.length) return true;
  return required.some((key) => hasFeature(key));
}

export function filterNavGroups(groups, hasFeature, options = {}) {
  const { showShop = true } = options;
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.path?.startsWith('/store/') && !showShop) return false;
        const pathKey = Object.keys(NAV_FEATURE_MAP).find((p) => item.path === p || item.path?.startsWith(`${p}/`));
        if (!pathKey) return true;
        return isNavItemVisible(pathKey, hasFeature);
      }),
    }))
    .filter((g) => g.items.length > 0);
}
