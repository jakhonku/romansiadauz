'use server';

import { cookies, headers } from 'next/headers';

import { LOCALE_COOKIE, defaultLocale, isLocale } from '@/lib/i18n/config';
import { applicationsAreOpen, resolveApplicationsCloseAt } from '@/lib/registration-window';
import { createAdminClient } from '@/lib/supabase/admin';
import { registrationSchema } from '@/lib/validation/registration';
import { getSiteStats } from '@/server/queries/settings';

import { callerIp, consumeRateLimit } from './rate-limit';

export type RegistrationResult =
  | { ok: true; reference: string }
  | { ok: false; reason: 'invalid' | 'closed' | 'rate_limited' | 'duplicate' | 'error' };

/** Postgres unique-violation. Raised by the partial unique index on `email`. */
const UNIQUE_VIOLATION = '23505';

/**
 * Accept a festival application.
 *
 * `registrations` has no `anon` INSERT policy (0007), so this action is the only path
 * to the table. It validates with the same Zod schema the form uses, throttles by IP,
 * then writes with the service-role client.
 *
 * The reference code is *not* generated here — a trigger in 0004 assigns it from a
 * per-year sequence, which removes the read-then-write race that generating it in Node
 * would have under concurrent submissions.
 *
 * The closing date is enforced here rather than only in the UI. The page that hides the
 * form is statically rendered and revalidated hourly, so for up to an hour after the
 * deadline a cached copy can still be served — and a form left open in a tab overnight
 * would post whatever happens to be in it. This check is the one an applicant cannot
 * route around.
 */
export async function submitRegistration(input: unknown): Promise<RegistrationResult> {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: 'invalid' };

  const data = parsed.data;
  if (data.website) return { ok: false, reason: 'invalid' };

  // Before the rate limit, so a late submission does not also burn one of the caller's
  // three hourly attempts on a form that can no longer be accepted.
  const { applicationsCloseAt } = await getSiteStats();
  if (!applicationsAreOpen(resolveApplicationsCloseAt(applicationsCloseAt))) {
    return { ok: false, reason: 'closed' };
  }

  const ip = await callerIp();
  // Tighter than the contact form: an application takes minutes to fill in honestly,
  // so three per hour from one address is already generous.
  const allowed = await consumeRateLimit(`registration:${ip ?? 'unknown'}`, 3, 60 * 60);
  if (!allowed) return { ok: false, reason: 'rate_limited' };

  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const userAgent = (await headers()).get('user-agent');

  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from('registrations')
    .insert({
      first_name: data.firstName,
      last_name: data.lastName,
      middle_name: data.middleName || null,
      birth_date: data.birthDate,

      institution: data.institution || null,
      faculty: data.faculty || null,
      position_title: data.position || null,

      address: data.address,
      email: data.email,
      phone: data.phone,

      programme_round_1: data.programmeRound1,
      programme_round_2: data.programmeRound2 || null,
      programme_round_3: data.programmeRound3 || null,

      accompanist_name: data.accompanistName || null,
      accompanist_workplace: data.accompanistWorkplace || null,
      nomination_id: data.nominationId || null,

      submitted_ip: ip,
      user_agent: userAgent?.slice(0, 500) ?? null,
      locale: isLocale(cookieLocale) ? cookieLocale : defaultLocale,
    })
    .select('reference_code')
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { ok: false, reason: 'duplicate' };
    console.error('[registration] insert failed:', error.message);
    return { ok: false, reason: 'error' };
  }

  return { ok: true, reference: row.reference_code };
}
