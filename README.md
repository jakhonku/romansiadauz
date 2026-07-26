# Romansiada Uzbekistan

Official website and admin panel for the International Romansiada Uzbekistan
festival-competition.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS ·
Radix · Framer Motion · Supabase (Postgres + Auth) · Vercel

The design contract lives in [`ARCHITECTURE.md`](./ARCHITECTURE.md) — read that first.
It explains the decisions this README only summarises.

---

## Local development

```bash
npm install
cp .env.example .env.local     # then fill in the Supabase values
npm run dev                    # http://localhost:3000
```

The public site is trilingual and locale-prefixed: `/uz`, `/ru`, `/en`. A bare `/`
redirects based on the `NEXT_LOCALE` cookie, then `Accept-Language`.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server (webpack) |
| `npm run dev:turbo` | Dev server with Turbopack — faster compiles, less stable here |
| `npm run build` | Clears `.next`, then a production build |
| `npm run clean` | Deletes `.next` |
| `npm run verify` | typecheck + lint + build. Run before pushing |
| `npm run db:push` | Applies migrations (requires `supabase link`) |
| `npm run db:types` | Regenerates `src/types/database.types.ts` from the live schema |

**Do not run a build while the dev server is running.** Both write to `.next`, and a
mixed directory produces `Cannot find module './vendor-chunks/…'` and React Client
Manifest errors that look exactly like the app hanging. `npm run build` clears the
directory first for this reason; if things get strange, `npm run clean` and restart.

---

## Database

Migrations are ordered and idempotent, so re-running them is safe.

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npm run db:push
```

Without the CLI, paste `supabase/ALL_MIGRATIONS.sql` into the Supabase SQL editor and
run it, then `supabase/seed.sql`.

### First administrator

`supabase/create_first_admin.sql` creates one. Edit the three variables at the top, run
it in the SQL editor, then sign in at `/admin/login`. Every later staff member is
invited from `/admin/users` — no SQL needed.

Passwords are never stored by this application. Supabase Auth holds the bcrypt hash in
`auth.users`; `public.profiles` carries only the role and the active flag.

---

## Deploying to Vercel

1. Import the repository at [vercel.com/new](https://vercel.com/new). Next.js is
   detected automatically — no `vercel.json` is required.
2. Set the environment variables from `.env.example` under
   **Project → Settings → Environment Variables**:

   | Variable | Scope | Notes |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | all | |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all | |
   | `SUPABASE_SERVICE_ROLE_KEY` | all | **Server-only.** Bypasses RLS entirely |
   | `NEXT_PUBLIC_SITE_URL` | production | `https://romansiada.uz`, no trailing slash |
   | `SMTP_*` | optional | Unset means no outbound mail; everything else still works |

   `NEXT_PUBLIC_SITE_URL` is not cosmetic — canonical URLs, `hreflang`, `sitemap.xml`,
   `robots.txt` and OpenGraph image URLs are all built from it. A preview value leaking
   into production makes search engines index the wrong origin.

3. Add the domain under **Settings → Domains** and point DNS at Vercel.
4. In Supabase, add the production origin to **Authentication → URL Configuration →
   Redirect URLs**, or staff invitation links will bounce.

### After deploying

- `/sitemap.xml` and `/robots.txt` are generated; submit the sitemap to Search Console.
- `/admin` is excluded from indexing by `robots.ts` *and* by an `X-Robots-Tag` header in
  `next.config.ts`, and is served `no-store`.

### A note on database region

Public pages are statically prerendered and revalidated hourly, so visitors do not wait
on the database. The admin panel is dynamic and does, so its responsiveness is bounded
by the round-trip time to the Supabase region — measured at roughly 450ms on the current
project. If the panel feels sluggish in production, the region is the cause rather than
the code, and a Supabase project closer to the audience is the fix.

---

## Project layout

```
src/
  app/[locale]/     public site (static + ISR)
  app/admin/        admin panel (dynamic, auth-gated)
  components/       ui/ · common/ · sections/ · layout/ · motion/
  lib/              i18n, auth, validation, seo, supabase clients, utils
  server/           actions/ (mutations) · queries/ (reads)
supabase/
  migrations/       ordered, idempotent SQL
  seed.sql
```

`components/` never imports from `server/`. Data reaches a component as props from a
Server Component; the shapes that cross that line live in `src/types/content.ts`.
