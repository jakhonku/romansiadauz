'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

/**
 * Thin passthrough over `next-themes`.
 *
 * It exists as its own module purely so the `'use client'` boundary sits here and the
 * root layout can stay a Server Component.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
