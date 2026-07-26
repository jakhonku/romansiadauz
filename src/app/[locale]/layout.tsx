import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BackgroundAudio } from '@/components/common/background-audio';
import { ThemeProvider } from '@/components/common/theme-provider';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader, type SiteHeaderLabels } from '@/components/layout/site-header';
import { fontVariables } from '@/lib/fonts';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, localeMetadata, locales, type Locale } from '@/lib/i18n/config';
import { primaryNav, resolveNav } from '@/lib/navigation';
import { buildMetadata } from '@/lib/seo/metadata';

/** All three locales are pre-rendered at build time; none is a dynamic fallback. */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const d = await getDictionary(locale);

  return {
    ...buildMetadata({
      locale,
      path: '/',
      title: `${d.meta.siteName} — ${d.meta.tagline}`,
      description: d.meta.description,
    }),
    // Inner pages set their own title; this template frames it consistently.
    title: {
      default: `${d.meta.siteName} — ${d.meta.tagline}`,
      template: `%s · ${d.meta.shortName}`,
    },
    applicationName: d.meta.siteName,
    // Served from `public/`, not the `app/` file convention: the branded set lives
    // alongside the other brand assets, and `app/favicon.ico` would collide with
    // `public/favicon.ico` (Next answers that route with a 500).
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/icon.png', type: 'image/png' },
      ],
      apple: '/apple-icon.png',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // A hand-typed `/de/...` must 404 rather than render the Uzbek site under a German URL.
  if (!isLocale(locale)) notFound();

  const d = await getDictionary(locale as Locale);

  const headerLabels: SiteHeaderLabels = {
    siteName: d.meta.siteName,
    shortName: d.meta.shortName,
    region: d.meta.region,
    register: d.nav.register,
    openMenu: d.nav.openMenu,
    closeMenu: d.nav.closeMenu,
    menu: d.nav.menu,
    language: d.nav.language,
    skipToContent: d.nav.skipToContent,
    theme: {
      theme: d.nav.theme,
      light: d.nav.themeLight,
      dark: d.nav.themeDark,
      system: d.nav.themeSystem,
    },
  };

  return (
    // `suppressHydrationWarning` is required by next-themes: its inline script sets the
    // `class` and `style` on <html> before React hydrates, so the attributes legitimately
    // differ from the server output. It suppresses the warning on this element only.
    <html lang={localeMetadata[locale].htmlLang} dir={localeMetadata[locale].dir} suppressHydrationWarning>
      <body className={`${fontVariables} min-h-dvh bg-background font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader locale={locale} nav={resolveNav(primaryNav, d)} labels={headerLabels} />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter locale={locale} dictionary={d} />
          </div>
          <BackgroundAudio src="/music/theme.mp3" />
        </ThemeProvider>
      </body>
    </html>
  );
}
