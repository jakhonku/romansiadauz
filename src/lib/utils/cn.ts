import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge has to be taught our custom font sizes.
 *
 * Out of the box it parses `text-*` into two groups — font size and text colour — and
 * decides between them by looking at the value. `display-lg`, `kicker` and friends match
 * no known size and no arbitrary length, so it files them under *colour*. The result is
 * silent and ugly: `cn('text-display-lg', 'text-foreground')` sees two colour classes,
 * keeps the last, and the heading renders at body size with no error anywhere.
 *
 * Registering them in the `font-size` group makes the conflict resolution correct — and
 * this list must be kept in step with `theme.extend.fontSize` in `tailwind.config.ts`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display-2xl',
            'display-xl',
            'display-lg',
            'display-md',
            'display-sm',
            'kicker',
            'eyebrow',
          ],
        },
      ],
    },
  },
});

/** Merge conditional class names, with later Tailwind utilities winning conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
