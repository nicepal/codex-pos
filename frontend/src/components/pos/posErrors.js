/** Map API / network errors to short cashier-friendly messages. */
export function friendlyPosError(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;
  if (!err.response) {
    return 'Connection lost. The sale may be saved offline if checkout was in progress.';
  }
  const msg = err.response?.data?.message;
  if (typeof msg === 'string' && msg.trim() && msg.length < 180 && !msg.includes('{')) {
    return msg;
  }
  const status = err.response?.status;
  if (status === 401 || status === 403) return 'You do not have permission for this action.';
  if (status === 404) return 'Item or order not found.';
  if (status === 409) return 'This sale conflicts with current stock or order state.';
  if (status === 422) return 'Please check the amounts and try again.';
  if (status >= 500) return 'Server error. Try again in a moment.';
  return fallback;
}
