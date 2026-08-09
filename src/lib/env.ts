import { z } from 'zod';

/**
 * Environment validation.
 *
 * Splitting client and server schemas matters: Next.js only inlines `NEXT_PUBLIC_*`
 * variables into the browser bundle, so a schema that referenced the service-role key
 * from client code would either crash at runtime or — far worse — leak the key.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('https://romasiada.uz'),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20, 'SUPABASE_SERVICE_ROLE_KEY is required for privileged server actions'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

function parseOrThrow<T extends z.ZodTypeAny>(schema: T, input: unknown, scope: string): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid ${scope} environment variables:\n${details}`);
  }
  return result.data;
}

/**
 * Client-safe configuration. Referenced explicitly rather than via `process.env[key]`
 * because Next.js performs a static text replacement — a computed key is not inlined.
 */
export const clientEnv = parseOrThrow(
  clientSchema,
  {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  'client',
);

/**
 * Server-only configuration. Lazily evaluated so that merely importing this module from
 * a shared file does not blow up a client build that has no service-role key.
 */
let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

export function serverEnv(): z.infer<typeof serverSchema> {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() was called in the browser. This is a bug — never import it from a Client Component.');
  }
  cachedServerEnv ??= parseOrThrow(serverSchema, process.env, 'server');
  return cachedServerEnv;
}

export const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

/**
 * Is a real Supabase project wired up?
 *
 * Before provisioning, `.env.local` carries placeholder values that pass the schema
 * above but point at a host that does not exist. Every query then waits out a DNS
 * failure — with five or six queries per page that was adding eight to eleven seconds
 * to *every* navigation, which reads as "the site is slow" rather than "the database is
 * missing". `safeQuery` checks this and skips the network entirely.
 */
export const isSupabaseConfigured = (() => {
  const url = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !url.includes('placeholder') && !key.startsWith('placeholder');
})();
