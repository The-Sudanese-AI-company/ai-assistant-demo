/**
 * Decide the reading direction of a single message by counting Arabic
 * letters against Latin letters. Each bubble decides for itself, so an
 * Arabic answer and an English answer can share one conversation.
 */
export function isMostlyArabic(text) {
  if (!text) return false;
  const arabic = (text.match(/[؀-ۿ]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return arabic > latin;
}
