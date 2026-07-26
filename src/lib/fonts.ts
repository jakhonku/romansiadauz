import { Inter, Playfair_Display } from 'next/font/google';

/**
 * Both faces are self-hosted by `next/font`, so there is no render-blocking request to
 * fonts.googleapis.com and no layout shift.
 *
 * The `cyrillic` subset is not optional here: the Russian locale is a first-class
 * language for this festival, and Playfair/Inter both fall back to an ugly system
 * serif for Cyrillic glyphs without it.
 */
export const fontDisplay = Playfair_Display({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  display: 'swap',
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
});

export const fontSans = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
});

export const fontVariables = `${fontDisplay.variable} ${fontSans.variable}`;
