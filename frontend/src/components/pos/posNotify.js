import { notifications } from '@mantine/notifications';

/** Thin POS toast helpers — UI only; keeps snackbar call sites consistent. */
export function posNotify(message, { color = 'blue', title, autoClose = 4000, id } = {}) {
  notifications.show({
    id,
    title,
    message,
    color,
    autoClose,
    withCloseButton: true,
  });
}

export function posNotifyError(message, opts = {}) {
  posNotify(message, { color: 'red', autoClose: 5000, ...opts });
}

export function posNotifySuccess(message, opts = {}) {
  posNotify(message, { color: 'teal', ...opts });
}

export function posNotifyWarning(message, opts = {}) {
  posNotify(message, { color: 'yellow', ...opts });
}
