import { Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import {
  FacebookIcon,
  InstagramIcon,
  TelegramIcon,
  YoutubeIcon,
} from '@/components/common/social-icons';
import { Wordmark } from '@/components/common/wordmark';
import { Separator } from '@/components/ui/separator';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { localizeHref, type Locale } from '@/lib/i18n/config';
import { legalNav, participantNav, primaryNav } from '@/lib/navigation';
import { siteConfig, type SocialPlatform } from '@/lib/site-config';

const socialIcons: Record<SocialPlatform, typeof InstagramIcon> = {
  instagram: InstagramIcon,
  telegram: TelegramIcon,
  youtube: YoutubeIcon,
  facebook: FacebookIcon,
};

const socialLabels: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  telegram: 'Telegram',
  youtube: 'YouTube',
  facebook: 'Facebook',
};

/**
 * Site footer — a Server Component, so none of the dictionary or the icon set reaches
 * the client bundle. Nothing here is interactive.
 */
export function SiteFooter({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const d = dictionary;
  const href = (to: string) => localizeHref(to, locale);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface text-surface-foreground">
      <div className="container py-section-sm">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.3fr]">
          <div className="max-w-sm">
            <Link href={href('/')} className="group inline-block">
              <Wordmark
                name={d.meta.shortName}
                region={d.meta.region}
                size="lg"
                gradientId="brand-footer"
              />
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{d.footer.about}</p>

            <div className="mt-6 flex items-center gap-2">
              {(Object.keys(siteConfig.social) as SocialPlatform[]).map((platform) => {
                const Icon = socialIcons[platform];
                return (
                  <a
                    key={platform}
                    href={siteConfig.social[platform]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={socialLabels[platform]}
                    className="rounded-full border border-border p-2.5 text-muted-foreground transition-colors duration-300 hover:border-gold hover:text-gold-ink"
                  >
                    <Icon className="size-4" />
                  </a>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-2 border-t border-border/40 pt-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {locale === 'uz' ? 'Tashkilotchi' : locale === 'ru' ? 'Организатор' : 'Organiser'}
              </span>
              <div className="flex items-center gap-4">
                <div className="relative size-16 overflow-hidden rounded-lg bg-white p-1 border border-border/30 shadow-sm shrink-0">
                  <Image
                    src="/images/organizer-logo.jpg"
                    alt="Opera san'ati birlashmasi"
                    width={64}
                    height={64}
                    className="object-contain size-full"
                  />
                </div>
                <span className="text-sm font-semibold leading-snug text-foreground">
                  {locale === 'uz' ? '«Opera san’ati birlashmasi»' : locale === 'ru' ? '«Opera san’ati birlashmasi»' : '“Opera san’ati birlashmasi”'}
                </span>
              </div>
            </div>
          </div>

          <FooterColumn title={d.footer.navigation}>
            {primaryNav.map((item) => (
              <FooterLink key={item.href} href={href(item.href)}>
                {item.label(d)}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title={d.footer.participants}>
            {participantNav.map((item) => (
              <FooterLink key={item.href} href={href(item.href)}>
                {item.label(d)}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title={d.footer.contactUs}>
            <li>
              <a
                href={`tel:${siteConfig.phoneHref}`}
                className="flex items-start gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Phone className="mt-0.5 size-4 shrink-0 text-gold" />
                <span dir="ltr">{siteConfig.phone}</span>
              </a>
            </li>
            <li>
              <a
                href={`mailto:${siteConfig.email}`}
                className="flex items-start gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Mail className="mt-0.5 size-4 shrink-0 text-gold" />
                {siteConfig.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0 text-gold" />
              {d.contact.address}: {siteConfig.addressKey}
            </li>
          </FooterColumn>
        </div>

        <Separator tone="gold" className="my-10" />

        <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {siteConfig.foundingYear}–{year} {d.meta.siteName}. {d.footer.rights}
          </p>
          <ul className="flex items-center gap-6">
            {legalNav.map((item) => (
              <li key={item.href}>
                <Link href={href(item.href)} className="transition-colors hover:text-foreground">
                  {item.label(d)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="kicker">{title}</h2>
      <ul className="mt-5 flex flex-col gap-3">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
      >
        {children}
      </Link>
    </li>
  );
}
