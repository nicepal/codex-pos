/** Nav paths gated by feature pack keys */
export const NAV_FEATURE_MAP = {
  '/transfers': ['inventory_pro'],
  '/stock-take': ['inventory_pro'],
  '/purchase-orders': ['inventory_pro'],
  '/employees': ['staff_pro'],
  '/team': ['staff_pro'],
  '/drawer': ['staff_pro'],
  '/shifts': ['staff_pro'],
  '/coupons': ['catalog_pro'],
  '/marketplace': ['omnichannel'],
  '/marketing': ['marketing_pro'],
  '/accounting': ['finance_pro'],
  '/manufacturing': ['mfg_pro'],
  '/restaurant': ['restaurant_pro'],
  '/ai-insights': ['ai_pro'],
  '/kds': ['restaurant_pro'],
};

export const SHOP_FEATURE = 'omnichannel';

/** Longest-prefix match so /restaurant/tables → restaurant_pro, etc. */
export function getRequiredFeaturesForPath(pathname) {
  if (!pathname) return null;
  const match = Object.entries(NAV_FEATURE_MAP)
    .filter(([path]) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b[0].length - a[0].length)[0];
  return match?.[1] || null;
}

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
        const required = getRequiredFeaturesForPath(item.path);
        if (!required?.length) return true;
        return required.some((key) => hasFeature(key));
      }),
    }))
    .filter((g) => g.items.length > 0);
}
