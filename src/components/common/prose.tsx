import { sanitizeHtml } from '@/lib/utils/sanitize';
import { cn } from '@/lib/utils/cn';

/**
 * Renders editor-authored HTML.
 *
 * The single place in the product where `dangerouslySetInnerHTML` is allowed, and it
 * sanitises unconditionally — callers cannot opt out, so there is no path to the raw
 * attribute that skips the filter.
 *
 * Typography comes from `@tailwindcss/typography`, retuned to the festival palette:
 * bordeaux links, gold blockquote rule, serif headings.
 */
export function Prose({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn(
        'prose prose-neutral max-w-none dark:prose-invert',
        'prose-headings:font-display prose-headings:font-semibold',
        'prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:text-primary-hover',
        'prose-blockquote:border-s-2 prose-blockquote:border-gold prose-blockquote:not-italic',
        'prose-img:rounded-media prose-hr:border-border',
        'prose-strong:text-foreground',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
