import { notifications } from '@mantine/notifications';

/** Storefront toast helpers (cart, auth, reviews). */
export function storeNotify(message, { color = 'blue', title, autoClose = 3500, id } = {}) {
  notifications.show({
    id,
    title,
    message,
    color,
    autoClose,
    withCloseButton: true,
  });
}

export function storeNotifySuccess(message, opts = {}) {
  storeNotify(message, { color: 'teal', ...opts });
}

export function storeNotifyError(message, opts = {}) {
  storeNotify(message, { color: 'red', autoClose: 5000, ...opts });
}

export function storeNotifyCartAdded(productName, quantity = 1) {
  const qty = Number(quantity) || 1;
  storeNotifySuccess(
    qty > 1 ? `${productName} × ${qty} added to your cart.` : `${productName} added to your cart.`,
    {
      title: 'Added to cart',
      id: `cart-add-${String(productName).slice(0, 40)}`,
      autoClose: 4000,
    }
  );
}
