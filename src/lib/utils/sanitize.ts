import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitise rich-text HTML before it reaches `dangerouslySetInnerHTML`.
 *
 * Applied on write *and* on render (ARCHITECTURE §6). Sanitising twice is not
 * redundancy theatre: the write-side pass can only protect rows written after it
 * shipped, while the render-side pass also covers rows imported directly into the
 * database, written by an older build, or authored before a DOMPurify bypass was
 * patched.
 *
 * The allow-list is deliberately narrow — what the Tiptap editor can actually produce.
 * `target="_blank"` is permitted on links, so the hook below repairs the
 * reverse-tabnabbing hole that opens with it.
 */
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'blockquote', 'code', 'pre',
  'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption',
  'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span',
];

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class', 'style'];

let hookInstalled = false;

function installHook() {
  if (hookInstalled) return;
  hookInstalled = true;

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
      // Without `noopener`, the opened page gets a handle on `window.opener` and can
      // navigate this tab to a phishing clone.
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

export function sanitizeHtml(dirty: string): string {
  installHook();

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Blocks `javascript:` and `data:` URLs in href/src while allowing normal links,
    // relative paths and mailto/tel.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}
