'use server';

import { redirect } from 'next/navigation';

import { createServerSupabase } from '@/lib/supabase/server';

import { callerIp, consumeRateLimit } from './rate-limit';

export type SignInResult = { ok: false; reason: 'invalid' | 'inactive' | 'rate_limited' };

/**
 * Staff sign-in.
 *
 * On success this never returns — it redirects, which also discards the submitted
 * password from the client's React state.
 *
 * `next` is validated before use. An open redirect here would be a phishing gift: an
 * attacker mails a `/admin/login?next=https://evil.example` link, the victim signs in
 * for real, and lands on a cloned panel asking them to "confirm" their password. Only
 * same-origin absolute paths are accepted, and `//host` is rejected because the browser
 * reads it as protocol-relative.
 */
function safeNext(next: string | undefined): string {
  if (!next) return '/admin';
  if (!next.startsWith('/') || next.startsWith('//')) return '/admin';
  if (!next.startsWith('/admin')) return '/admin';
  return next;
}

export async function signIn(formData: FormData): Promise<SignInResult | never> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(formData.get('next')?.toString());

  if (!email || !password) return { ok: false, reason: 'invalid' };

  const ip = await callerIp();
  // Keyed on IP *and* address: a shared office NAT should not lock everyone out
  // because one person fat-fingered their password, but a spray across many accounts
  // from one address still trips the IP bucket.
  const [ipOk, accountOk] = await Promise.all([
    consumeRateLimit(`signin:ip:${ip ?? 'unknown'}`, 20, 15 * 60),
    consumeRateLimit(`signin:acct:${email}`, 8, 15 * 60),
  ]);
  if (!ipOk || !accountOk) return { ok: false, reason: 'rate_limited' };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) return { ok: false, reason: 'invalid' };

  // Credentials were right, but the account may have been deactivated. Sign the
  // session straight back out so a disabled account cannot hold a valid token.
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', data.user.id)
    .single();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { ok: false, reason: 'inactive' };
  }

  redirect(next);
}

export async function signOut(): Promise<never> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
