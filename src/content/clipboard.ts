// Clipboard writes for the action bar (spec §7.4).

/**
 * Tries the async clipboard first. Insecure (http) pages do not have it, so a hidden textarea and
 * execCommand("copy") follow. The textarea goes into `container` (inside the bar's shadow root):
 * on 8.x/9.x the flyout's focus trap would pull focus back from an element on document.body.
 */
export async function copyText(text: string, container: Element): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Fall back to execCommand below.
  }
  const doc = container.ownerDocument;
  const area = doc.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
  container.append(area);
  try {
    area.select();
    if (!doc.execCommand("copy")) throw new Error("copy failed");
  } finally {
    area.remove();
  }
}
