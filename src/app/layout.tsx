import type { Metadata, Viewport } from 'next';

import { siteUrl } from '@/lib/env';

import './globals.css';

/**
 * Pass-through root layout.
 *
 * `<html>` and `<body>` are rendered one level down — by `[locale]/layout.tsx` for the
 * public site and by `admin/layout.tsx` for the panel. The two surfaces genuinely need
 * different documents: the public one carries a `lang` that changes per locale and the
 * festival's serif/sans pair, while the admin panel is a single-language, denser shell.
 * Forcing both through one root would mean resolving the locale outside the segment
 * that owns it.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#100e0f' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
