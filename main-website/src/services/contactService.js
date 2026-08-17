/**
 * Contact form submission.
 * TODO: Wire to a public contact API when the backend exposes one.
 * Currently simulates success after client-side validation.
 */
export async function submitContact(payload) {
  // Expected future endpoint example:
  // POST `${import.meta.env.VITE_API_URL}/public/contact`
  // For now there is no public contact route in the API.

  await new Promise((r) => setTimeout(r, 600));

  if (!payload?.email || !payload?.message || !payload?.name) {
    return { success: false, message: 'Please fill in name, email, and message.' };
  }

  // Persist locally so demos can verify submissions without a backend.
  try {
    const key = 'codexpos_contact_drafts';
    const prev = JSON.parse(localStorage.getItem(key) || '[]');
    prev.unshift({ ...payload, at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(prev.slice(0, 20)));
  } catch {
    // ignore storage failures
  }

  return {
    success: true,
    message: 'Thanks — your message was captured locally. A public contact API is not wired yet (TODO).',
  };
}
