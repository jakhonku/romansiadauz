'use server';

import { cookies } from 'next/headers';

import { LOCALE_COOKIE, defaultLocale, isLocale } from '@/lib/i18n/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { contactSchema } from '@/lib/validation/contact';

import { callerIp, consumeRateLimit } from './rate-limit';

export type ContactResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'rate_limited' | 'error' };

/**
 * Accept a contact message.
 *
 * `contact_messages` has no `anon` INSERT policy, so this action is the only way in.
 * Order matters: validate, throttle, then write. Throttling before validation would
 * let a flood of malformed requests burn a genuine visitor's quota.
 */
export async function submitContactMessage(input: unknown): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: 'invalid' };

  const data = parsed.data;

  // A filled honeypot is a bot. Reported as success so the bot has no signal to learn
  // from, while nothing is written.
  if (data.website) return { ok: true };

  const ip = await callerIp();
  const allowed = await consumeRateLimit(`contact:${ip ?? 'unknown'}`, 5, 15 * 60);
  if (!allowed) return { ok: false, reason: 'rate_limited' };

  // Which language the visitor wrote in, so a reply goes back in the same one.
  // Middleware keeps this cookie current on every navigation.
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;

  const supabase = createAdminClient();
  const { error } = await supabase.from('contact_messages').insert({
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    subject: data.subject || null,
    message: data.message,
    submitted_ip: ip,
    locale: isLocale(cookieLocale) ? cookieLocale : defaultLocale,
  });

  if (error) {
    console.error('[contact] insert failed:', error.message);
    return { ok: false, reason: 'error' };
  }

  return { ok: true };
}
