'use client';

import { localeMetadata, locales, type Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils/cn';

/**
 * Locale tab strip shared by every translated-content editor.
 *
 * The coverage dot is the point of this component: an editor's first question in a
 * multilingual CMS is "what still needs translating?", and answering it by opening each
 * tab in turn is the thing that makes such panels tedious.
 *
 * Panels are rendered by the caller and must stay mounted — hidden with the `hidden`
 * *class*, never the `hidden` attribute, which Tailwind's `flex`/`grid` utilities
 * override. `panelClass` below encodes that so no caller has to remember it.
 */
export function TranslationTabs({
  active,
  onChange,
  filled,
  label,
  className,
}: {
  active: Locale;
  onChange: (locale: Locale) => void;
  /** Which locales have their required field filled in. */
  filled: (locale: Locale) => boolean;
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn('flex gap-1', className)}>
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          role="tab"
          aria-selected={active === locale}
          onClick={() => onChange(locale)}
          className={cn(
            'flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
            active === locale
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          {localeMetadata[locale].label}
          <span
            aria-hidden
            className={cn(
              'size-1.5 rounded-full',
              filled(locale) ? 'bg-success' : 'bg-current opacity-30',
            )}
          />
        </button>
      ))}
    </div>
  );
}

/** Class for a tab panel — see the note above about `hidden` as attribute vs class. */
export function panelClass(visible: boolean, extra = 'gap-5'): string {
  return visible ? `mt-6 flex flex-col ${extra}` : 'hidden';
}
