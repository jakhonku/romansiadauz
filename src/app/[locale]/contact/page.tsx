import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ContactForm } from '@/components/common/contact-form';
import {
  FacebookIcon,
  InstagramIcon,
  TelegramIcon,
  YoutubeIcon,
} from '@/components/common/social-icons';
import { Reveal } from '@/components/motion/reveal';
import { PageHero } from '@/components/sections/page-hero';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, localizeHref, type Locale } from '@/lib/i18n/config';
import { buildMetadata } from '@/lib/seo/metadata';
import { siteConfig, type SocialPlatform } from '@/lib/site-config';

export const revalidate = 3600;

const socialIcons: Record<SocialPlatform, typeof InstagramIcon> = {
  instagram: InstagramIcon,
  telegram: TelegramIcon,
  youtube: YoutubeIcon,
  facebook: FacebookIcon,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = await getDictionary(locale);

  return buildMetadata({
    locale,
    path: '/contact',
    title: d.contact.title,
    description: d.contact.subtitle,
  });
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const d = await getDictionary(locale);
  const c = d.contact;

  return (
    <>
      <PageHero
        kicker={d.nav.contact}
        title={c.title}
        subtitle={c.subtitle}
        crumbs={[
          { label: d.nav.home, href: localizeHref('/', locale as Locale) },
          { label: d.nav.contact },
        ]}
      />

      <section className="section bg-background">
        <div className="container grid gap-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <Reveal className="flex flex-col gap-8">
            <ContactLine icon={Phone} label={c.phone}>
              <a href={`tel:${siteConfig.phoneHref}`} className="transition-colors hover:text-primary" dir="ltr">
                {siteConfig.phone}
              </a>
            </ContactLine>

            <ContactLine icon={Mail} label={c.email}>
              <a href={`mailto:${siteConfig.email}`} className="transition-colors hover:text-primary">
                {siteConfig.email}
              </a>
            </ContactLine>

            <ContactLine icon={MapPin} label={c.address}>
              {siteConfig.addressKey}
            </ContactLine>

            <ContactLine icon={Clock} label={c.workingHours}>
              09:00 – 18:00
            </ContactLine>

            <div>
              <h2 className="kicker">{c.socialMedia}</h2>
              <div className="mt-4 flex items-center gap-2">
                {(Object.keys(siteConfig.social) as SocialPlatform[]).map((platform) => {
                  const Icon = socialIcons[platform];
                  return (
                    <a
                      key={platform}
                      href={siteConfig.social[platform]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={platform}
                      className="rounded-full border border-border p-3 text-muted-foreground transition-colors duration-300 hover:border-gold hover:text-gold-ink"
                    >
                      <Icon className="size-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-card border border-border bg-card p-7 shadow-card sm:p-9">
              <h2 className="font-display text-display-sm font-semibold">{c.form.title}</h2>

              <div className="mt-8">
                <ContactForm
                  labels={{
                    name: c.form.name,
                    email: c.form.email,
                    phone: c.form.phone,
                    subject: c.form.subject,
                    message: c.form.message,
                    namePlaceholder: c.form.namePlaceholder,
                    messagePlaceholder: c.form.messagePlaceholder,
                    submit: c.form.submit,
                    submitting: c.form.submitting,
                    success: c.form.success,
                    error: c.form.error,
                    required: d.validation.required,
                    optional: d.common.optional,
                  }}
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

function ContactLine({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Phone;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-full border border-gold/50 text-gold">
        <Icon className="size-[1.15rem]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1.5 text-base">{children}</p>
      </div>
    </div>
  );
}
