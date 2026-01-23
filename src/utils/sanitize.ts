export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Check if an event target is part of the Devver comment UI
 * With Shadow DOM, we mainly check if the target is the shadow host
 */
export function isCommentUi(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  // Check if it's the shadow host or has our ID
  return target.id === "devver-overlay-root" ||
    target.closest("#devver-overlay-root") !== null;
}
