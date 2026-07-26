# Romansiada Uzbekistan — Architecture

**Domain:** romansiada.uz
**Stack:** Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS · shadcn/ui · Framer Motion · Supabase (Postgres + Auth + Storage) · Vercel

This document is the design contract for the implementation. It is written before the
feature code and is kept accurate as the build proceeds.

---

## 1. Product shape

Two distinct applications served from one Next.js deployment:

| Surface | Routes | Audience | Rendering |
| --- | --- | --- | --- |
| Public site | `/[locale]/…` | Visitors, applicants | Static + ISR, streamed |
| Admin panel | `/admin/…` | Staff (4 roles) | Dynamic, auth-gated, `no-store` |

The public site is fully localized (`uz`, `ru`, `en`). The admin panel keeps
un-prefixed routes and resolves its UI language from a `NEXT_LOCALE` cookie, so
operators are never forced through a locale segment to reach a record.

---

## 2. Design language

The brief is *luxury classical*: white, gold, dark red, light gray; elegant serif
headings over a modern sans body; very spacious; minimal.

### 2.1 Colour

Semantic tokens are declared as HSL triples on `:root` and `.dark`, then exposed to
Tailwind via `hsl(var(--token))`. Nothing in feature code references a raw hex value.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `background` | `#FFFFFF` | `#100E0F` | Page canvas |
| `surface` | `#FAF9F6` | `#181416` | Raised cards, sections |
| `muted` | `#EFEDE7` | `#221D20` | Light-gray fills, skeletons |
| `foreground` | `#171315` | `#F6F2EC` | Body text |
| `muted-foreground` | `#5F585B` | `#A79FA3` | Secondary text |
| `primary` (bordeaux) | `#7A1220` | `#C9455A` | Brand actions, accents |
| `primary-foreground` | `#FFFFFF` | `#12080A` | Text on bordeaux |
| `gold` | `#C9A227` | `#D9B845` | **Decoration only** — rules, ornaments, icons |
| `gold-ink` | `#7C6218` | `#E3C766` | Gold used as *text*, contrast-safe |
| `border` | `#E4E0D8` | `#2C2528` | Hairlines |

**Accessibility rule that shapes the palette:** decorative gold `#C9A227` on white is
≈3.6:1 — it fails AA for body text. So gold is split into two tokens. `gold` may only
be used for non-text ornament (dividers, borders, icon glyphs paired with a label) and
for text at ≥24px bold; `gold-ink` (≈5.6:1 on white) is the only gold permitted for
small text. Bordeaux `#7A1220` on white is ≈10.7:1 and is safe everywhere.

### 2.2 Typography

- **Display / headings:** Playfair Display (`next/font/google`, variable) — high-contrast
  Didone serif. Chosen over Cormorant because it holds presence at hero sizes and ships
  a **Cyrillic** subset, which is mandatory for the Russian locale.
- **Body / UI:** Inter (variable) — Latin + Cyrillic, excellent at small sizes.

Both are self-hosted through `next/font`, so there is no render-blocking network request
and no layout shift. Uzbek is set in Latin script.

A fluid type scale (`clamp()`) drives the display sizes so the hero never needs
breakpoint-specific font sizes.

**Custom sizes must be registered with tailwind-merge.** `cn()` extends it with the
`display-*`, `kicker` and `eyebrow` names. Without that, tailwind-merge cannot tell
`text-display-lg` from a colour utility, files it under `text-color`, and silently drops
it whenever a colour appears in the same `cn()` — headings then render at body size with
no error anywhere. Adding a size to `theme.extend.fontSize` means adding it to
`lib/utils/cn.ts` too.

### 2.3 Space, shape, depth

- Spacing rhythm is a 4px base; section vertical padding runs `clamp(5rem, 10vw, 9rem)`
  to deliver the requested "very spacious" feel.
- Radii: cards `1rem`, media `1.25rem`, pills `9999px`.
- Shadows are soft, warm and low-opacity (`--shadow-card`, `--shadow-lift`) rather than
  neutral black, so they sit correctly on the ivory surface.

### 2.4 Motion

Framer Motion, wrapped in four reusable primitives so pages never hand-roll variants:

`<Reveal>` (fade + rise on scroll) · `<Stagger>` (children cascade) · `<Parallax>`
(hero depth via `useScroll`) · `<CountUp>` (statistics).

Every primitive honours `prefers-reduced-motion` by collapsing to an instant, opacity-only
state. Page transitions use a shared layout wrapper with `AnimatePresence`.

---

## 3. Folder structure

```
src/
  app/
    [locale]/                  # public site
      layout.tsx               # locale shell: fonts, theme, header/footer
      page.tsx                 # home
      about/ regulations/ judges/ news/ gallery/ videos/ winners/
      contact/ registration/ p/[slug]/
    admin/
      login/
      (dashboard)/             # route group: auth-gated shell
        page.tsx registrations/ news/ gallery/ videos/ judges/
        winners/ partners/ pages/ settings/ users/
    api/                       # only where a route handler is genuinely required
    sitemap.ts  robots.ts  opengraph-image.tsx
  components/
    ui/                        # shadcn primitives (atoms)
    common/                    # molecules: cards, pagination, switchers, dropzone
    sections/                  # organisms: hero, stats, grids, CTA
    layout/                    # header, footer, nav, admin chrome
    motion/                    # Reveal, Stagger, Parallax, CountUp
  lib/
    supabase/                  # browser / server / admin clients
    i18n/                      # config, dictionaries, helpers
    validation/                # Zod schemas, shared with server actions
    auth/                      # session, RBAC guards
    utils/                     # cn, formatting, slugify, sanitize
    seo/                       # metadata builders, JSON-LD
  server/
    actions/                   # 'use server' mutations, one file per domain
    queries/                   # cached read helpers
  types/                       # database.types.ts (generated) + domain types
  content/dictionaries/        # uz.json ru.json en.json
supabase/
  migrations/                  # ordered, idempotent SQL
  seed.sql
```

**Boundary rule:** `components/` never imports from `server/`. Data enters components
only as props from a Server Component. All mutations go through `server/actions`, all
reads through `server/queries`. The view-model shapes that cross that boundary live in
`types/content.ts`, so the rule holds literally and not merely at runtime.

**Public reads must not touch the request.** `lib/supabase/server.ts` reads `cookies()`,
and any route that touches `cookies()` drops out of static rendering. The public site is
ISR, so its queries use `lib/supabase/public.ts` — a sessionless anon client — instead.

**Public reads never throw.** Every query in `server/queries` runs through `safeQuery`,
which logs a failure and returns an empty result. An unprovisioned project, a paused
free-tier instance or a blip during revalidation then degrades to the section's empty
state — for which every dictionary already carries copy — rather than failing
`next build` or serving a 500.

**Document ownership:** `app/layout.tsx` is a pass-through that renders `{children}`
and nothing else. `<html>`/`<body>` belong to `[locale]/layout.tsx` and `admin/layout.tsx`
respectively, because the two surfaces need different documents — the public one carries
a `lang` that changes per locale plus the serif/sans pair, the panel is single-language
and denser. The consequence to remember: a boundary that renders *above* those layouts
(`app/not-found.tsx`, `app/global-error.tsx`) has to supply its own `<html>`/`<body>`,
since the pass-through gives it none.

---

## 4. Internationalisation

- `middleware.ts` negotiates locale from the path, then `NEXT_LOCALE` cookie, then
  `Accept-Language`, and redirects `/` → `/{locale}`.
- Dictionaries are plain JSON, loaded server-side and passed down; the client bundle
  never ships all three languages.
- `generateStaticParams` pre-renders all three locales.
- Metadata emits `alternates.languages` (hreflang) plus `x-default`.

### Content translation model

Editorial entities are **normalised into translation tables**:

```
news (id, slug, category_id, cover_path, status, published_at, …)
news_translations (news_id, locale, title, excerpt, body, seo_title, seo_description)
        UNIQUE (news_id, locale)
```

Same shape for `judges`, `albums`, `videos`, `winners`, `partners`, `pages`, `events`
and the two category tables.

Small **static reference lists** (`regions`, `districts`, `voice_types`,
`age_categories`) instead carry `name_uz / name_ru / name_en` columns. This is a
deliberate exception: these lists are seeded, never edited by users, and always fetched
whole for `<Select>` options — a join per option list would buy nothing. The trade-off
is documented here so it reads as a decision rather than an inconsistency.

Missing translations fall back `requested → ru → en`.

The fallback is resolved in TypeScript (`server/queries/shared.ts → pickTranslation`),
not in SQL. It is still **one round trip** — PostgREST embeds all three translation rows
with the parent — but the pick happens after the response. PostgREST cannot express a
correlated `LATERAL … ORDER BY array_position(...) LIMIT 1` against an embedded
relation, and the alternative is a database view per translated entity: nine more
migration objects to avoid transferring two short rows per record. If a payload ever
grows enough to justify it, the view is the upgrade path.

### One rule for formatting in Client Components

`Intl.NumberFormat` and `Intl.DateTimeFormat` are **not** safe inside a component that
hydrates. Node ships full ICU and formats `uz-UZ` 1000 as `1 000`; Chrome carries no
Uzbek locale data, falls back to its default, and produces `1,000`. The mismatch makes
React discard the subtree. Client-side formatting therefore goes through the
`Intl`-free helpers in `lib/i18n/format.ts` (`formatInteger`); Server Components, which
render once, may use `Intl` freely.

---

## 5. Data model

### Enums
`app_role` (`admin` `editor` `moderator` `viewer`) · `content_status` (`draft`
`published` `archived`) · `registration_status` (`pending` `approved` `rejected`) ·
`gender` (`male` `female`)

### Tables

**Identity** — `profiles` (1:1 with `auth.users`, holds `role`, `is_active`).

**Editorial** — `news_categories`, `news`, `judges`, `albums`, `photos`,
`video_categories`, `videos`, `winners`, `partners`, `pages`, `events`
(+ their `*_translations`).

**Applications** — `registrations` (every field from the brief, plus
`reference_code`, `status`, `reviewed_by`, `review_note`, storage paths for photo /
passport / performance video).

**Operations** — `contact_messages`, `site_settings` (single row, JSONB groups for
branding / SEO / analytics / SMTP / socials), `audit_logs`, `rate_limits`.

### Indexes
Slug lookups (`UNIQUE`), `(status, published_at DESC)` for every published list,
FK columns, `(registration_status, created_at DESC)`, and a **GIN trigram** index over
news titles + registration names to back admin search.

---

## 6. Security model

**Registrations and contact messages are never writable by `anon`.** There is no
public INSERT policy on those tables. Submissions go through a Server Action that
validates with Zod, enforces a rate limit, then writes with the service-role client.
This removes the usual "public insert" hole entirely — a leaked publishable key buys an
attacker nothing.

RLS on every table, no exceptions:

| Table group | `anon` / public | Staff |
| --- | --- | --- |
| Editorial | `SELECT` where `status = 'published'` | write by role |
| `registrations`, `contact_messages` | **none** | `admin`, `moderator` |
| `profiles` | none | self-read; `admin` writes |
| `site_settings` | `SELECT` public groups only | `admin` |
| `audit_logs`, `rate_limits` | none | `admin` read |

Role checks are resolved by a `SECURITY DEFINER` helper `auth_role()` that reads
`profiles`, avoiding the recursive-policy trap.

### RBAC matrix

| | admin | editor | moderator | viewer |
| --- | :-: | :-: | :-: | :-: |
| Dashboard | ● | ● | ● | ● |
| News / gallery / videos / pages | ● | ● | ○ | ○ |
| Judges / winners / partners | ● | ● | ○ | ○ |
| Registrations (review, export) | ● | ○ | ● | ○ |
| Contact messages | ● | ○ | ● | ○ |
| Users, settings | ● | ○ | ○ | ○ |

Enforced in three places: middleware (route), server action (mutation), RLS (data).

### Hardening
Secure headers + CSP via `next.config.ts`, CSRF absorbed by Server Actions' origin
check, HTML from the rich-text editor sanitised with DOMPurify **on write and on
render**, uploads constrained by MIME + size + extension, private bucket access only
through short-lived signed URLs.

---

## 7. Performance

`next/image` with AVIF/WebP everywhere · route-level code splitting plus `dynamic()`
for the editor, charts and lightbox · ISR (`revalidate`) on all public content with
tag-based invalidation fired by the admin actions · `React.cache` around per-request
queries · font subsetting through `next/font`.

Budget: LCP < 2.0s, CLS < 0.05, admin bundles excluded from public entrypoints.

---

## 8. SEO

Per-route `generateMetadata` · OpenGraph + Twitter cards with a generated OG image ·
`sitemap.ts` enumerating every locale × entity · `robots.ts` disallowing `/admin` ·
canonical + hreflang on every page · JSON-LD for `Organization`, `Event`,
`NewsArticle`, `BreadcrumbList` and `ImageGallery`.

---

## 9. Build order

1. ✅ Design system + theming
2. ✅ i18n infrastructure
3. ✅ SQL migrations, RLS, indexes, seed
4. ✅ Supabase clients, buckets, generated types
5. ✅ Public shell (header, footer, switchers) — plus the home hero and stats band
6. ✅ Home (about · events · news · judges · gallery · partners · CTA) — with the public
   read layer behind it · ⬜ About · ⬜ Regulations
7. ✅ Registration — multi-step form, Zod + Server Action, rate limit, honeypot.
   No uploads: the form mirrors the official paper blank, which asks for no files.
8. ✅ Judges · News (+ article) · Gallery (+ album, lightbox) · Videos · Winners ·
   Contact · `p/[slug]` · sitemap · robots
9. ✅ Auth + RBAC — `lib/auth/{rbac,session,admin-nav,admin-locale}.ts`, sign-in /
   sign-out actions, `/admin` document shell, login screen, auth-gated `(dashboard)`
   group, `/admin/forbidden`, dashboard counters
10. Admin CRUD modules
    - ✅ Registrations — filters, trigram search, detail, approve/reject/reopen,
      filtered XLSX export
    - ✅ Messages — inbox / unread / archive, read toggle, mailto reply
    - ✅ News — full CRUD, three-locale tabs, Tiptap editor, slug generation,
      scheduled publishing, path invalidation
    - ✅ Judges · winners · partners · events · pages · videos · gallery — one
      descriptor registry (`lib/admin/entities.ts`) rendered by one generic list and
      one generic form through `/admin/[entity]`
    - ✅ Users — role and activation, last-admin and self-lockout guards, invitations
    - ✅ Settings — per-group JSONB save; `smtp` deliberately excluded
    - ⬜ Photos inside an album; media upload UI (paths are typed by hand for now)

**Why some modules are generic and some are not.** Seven editorial entities share one
shape — scalar columns, a translation table, a status, a sort order — so they are
described once and rendered by shared components; seven bespoke forms would be seven
places to fix the next translation-pruning bug. News, registrations, messages, users and
settings each carry something the descriptor cannot express (a rich-text body with
scheduling, a review workflow, an inbox, role guards, JSONB groups), so they stay
explicit. The line is drawn at the point where bending the abstraction would cost more
than the duplication it saves.

**Cache invalidation, corrected.** §7 describes tag-based invalidation. The admin
actions use `revalidatePath` with route patterns (`'/[locale]/news', 'page'`) instead,
which clears all three locales in one call. Tags would require every read to go through
`fetch` or `unstable_cache`; these queries use the Supabase client directly. Same
effect, fewer moving parts — recorded so the doc and the code do not disagree.
11. SEO, performance, security passes
12. Docs, typecheck, lint, production build
