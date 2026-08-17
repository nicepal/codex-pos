import { createSlice } from '@reduxjs/toolkit';

function lineKey(item) {
  return `${item.product_id}:${item.variant_id || ''}`;
}

function cartStorageKey(slug) {
  return slug ? `codexpos:storefrontCart:${slug}` : null;
}

export function loadCartFromStorage(slug) {
  const key = cartStorageKey(slug);
  if (!key || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

export function saveCartToStorage(slug, items) {
  const key = cartStorageKey(slug);
  if (!key || typeof localStorage === 'undefined') return;
  try {
    if (!items?.length) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify({ items }));
  } catch {
    /* ignore quota / private mode */
  }
}

const storefrontCartSlice = createSlice({
  name: 'storefrontCart',
  initialState: { items: [], slug: null },
  reducers: {
    hydrateCart(state, action) {
      const { slug, items } = action.payload;
      state.slug = slug || null;
      state.items = Array.isArray(items) ? items : [];
    },
    addToCart(state, action) {
      const { quantity = 1, ...item } = action.payload;
      const key = lineKey(item);
      const existing = state.items.find((i) => lineKey(i) === key);
      if (existing) existing.quantity += quantity;
      else state.items.push({ ...item, quantity });
    },
    removeFromCart(state, action) {
      state.items.splice(action.payload, 1);
    },
    updateCartQty(state, action) {
      const { index, quantity, product_id, variant_id } = action.payload;
      let target = typeof index === 'number' ? index : -1;
      if (target < 0 && product_id) {
        const key = lineKey({ product_id, variant_id });
        target = state.items.findIndex((i) => lineKey(i) === key);
      }
      if (target < 0) return;
      if (quantity <= 0) state.items.splice(target, 1);
      else state.items[target].quantity = quantity;
    },
    clearStoreCart(state) {
      state.items = [];
    },
  },
});

export const {
  hydrateCart, addToCart, removeFromCart, updateCartQty, clearStoreCart,
} = storefrontCartSlice.actions;

export const selectStoreCartTotal = (state) =>
  state.storefrontCart.items.reduce((s, i) => s + i.sale_price * i.quantity, 0);

export const selectStoreCartCount = (state) =>
  state.storefrontCart.items.reduce((n, i) => n + i.quantity, 0);

export const selectCartQtyForProduct = (productId, variantId) => (state) => {
  const key = `${productId}:${variantId || ''}`;
  const item = state.storefrontCart.items.find((i) => lineKey(i) === key);
  return item?.quantity || 0;
};

export default storefrontCartSlice.reducer;
