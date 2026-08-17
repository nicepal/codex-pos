import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  hydrateCart, loadCartFromStorage, saveCartToStorage,
} from '../features/storefront/cartSlice';

/**
 * Persist storefront cart in localStorage, scoped by tenant slug
 * so carts never mix across stores.
 */
export default function useStorefrontCartPersistence(slug) {
  const dispatch = useDispatch();
  const items = useSelector((s) => s.storefrontCart.items);
  const cartSlug = useSelector((s) => s.storefrontCart.slug);
  const ready = useRef(false);

  // Hydrate when entering / switching store
  useEffect(() => {
    if (!slug) return;
    ready.current = false;
    const stored = loadCartFromStorage(slug);
    dispatch(hydrateCart({ slug, items: stored }));
    ready.current = true;
  }, [slug, dispatch]);

  // Persist on changes for the active slug
  useEffect(() => {
    if (!slug || !ready.current) return;
    if (cartSlug && cartSlug !== slug) return;
    saveCartToStorage(slug, items);
  }, [slug, cartSlug, items]);
}
