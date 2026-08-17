/**
 * Customer-facing storefront content helpers.
 * Never invent copy — only pass through real merchant text, and hide internal/system strings.
 */

const INTERNAL_COPY_RE = /onboarding|codex\s*pos|starter product|inventory synced|synced with our pos|from our pos/i;

/** Phrases to strip from announcements while keeping the rest of the message. */
const INTERNAL_PHRASE_RE = /\s*[·•|,/-]?\s*(Inventory synced with our POS|synced with our POS|from our POS)\s*[·•|,/-]?\s*/gi;

export function isInternalStorefrontCopy(value) {
  if (value == null) return true;
  const text = String(value).replace(/<[^>]+>/g, '').trim();
  if (!text) return true;
  return INTERNAL_COPY_RE.test(text);
}

/** Return a safe customer-facing description, or null when empty/internal. */
export function customerFacingDescription(value) {
  if (value == null) return null;
  const text = String(value).replace(/<[^>]+>/g, '').trim();
  if (!text || INTERNAL_COPY_RE.test(text)) return null;
  return text;
}

/**
 * Announcement: strip internal POS phrases; keep customer-facing parts.
 * Returns null when nothing useful remains.
 */
export function customerFacingAnnouncement(value) {
  if (value == null) return null;
  let text = String(value).replace(/<[^>]+>/g, '').trim();
  if (!text) return null;

  text = text.replace(INTERNAL_PHRASE_RE, ' · ').replace(/\s+/g, ' ').trim();
  text = text.replace(/^[\s·•|,/-]+|[\s·•|,/-]+$/g, '').trim();
  text = text.replace(/\s*[·•]\s*[·•]\s*/g, ' · ').trim();

  if (!text || INTERNAL_COPY_RE.test(text)) return null;
  return text;
}
