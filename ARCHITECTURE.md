# Romansiada Uzbekistan — Architecture

**Domain:** romasiada.uz
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
un-prefixed routes and resolves its UI language from a cookie, so operators are never
forced through a locale segment to reach a record.

**The panel's chrome ships in Uzbek and Russian only.** Staff work in one of those two;
an English *interface* nobody asked for would be a third copy of every label to keep in
step. This is the chrome alone — content is still authored in all three locales, because
visitors read all three, so every editor keeps its `UZ / RU / EN` translation tabs.

The choice lives in its own `ADMIN_LOCALE` cookie rather than in `NEXT_LOCALE`. An
operator previewing the English site in the next tab would otherwise drag the panel along
with them, and switching the panel to Russian would silently re-language the site they
were checking. `NEXT_LOCALE` is still consulted as a fallback (with `en` falling through
to Uzbek), so nobody has to make a choice before the panel picks a sensible one.

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
      about/ regulations/ notes/ judges/ news/ gallery/ videos/ winners/
      contact/ registration/ p/[slug]/
    admin/
      login/
      (dashboard)/             # route group: auth-gated shell
        page.tsx registrations/ news/ gallery/ videos/ judges/
        winners/ partners/ settings/ users/
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
  content/scores.ts            # competition repertoire, transcribed from the annex
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

### The Regulations are not content

`/[locale]/regulations` renders the approved «Положение», and `/[locale]/notes` renders
its repertoire annex. Both live in the repository — the text in the three dictionaries,
the repertoire in `content/scores.ts` — rather than in the CMS, for three reasons:

- **It is a document, not an entry.** An applicant is held to it, and the rule they read
  in Uzbek must be the rule the jury applies. Three rows that can be edited independently
  can be edited into disagreement; three dictionary blocks are reviewed and deployed
  together.
- **It changes once a season**, as a signed file, which is a deploy rather than an
  editorial workflow.
- **It cannot silently disappear.** A DB-backed page degrades to an empty state when the
  row is missing; the Regulations page cannot render blank.

The consequence to accept: revising it means editing `regulations` in `uz.json`, `ru.json`
and `en.json` and shipping. The Russian block is the document verbatim; the other two are
translations of it. Nothing on that page is authored — the criteria weights and document
checklist that were there before the document arrived were invented placeholders, and
they are gone.

**§ IV drives the reference lists.** `nominations` and `age_categories` are seeded from
the Regulations, not from a guess: a form that offers a category the jury does not judge
produces an entry that cannot be scored. Migration `0011` retires the placeholder rows by
deactivating them rather than deleting — `registrations.nomination_id` is ON DELETE
RESTRICT, so a nomination an applicant already chose cannot be removed without taking
their application with it.

---

## 5. Data model

### Enums
`app_role` (`admin` `editor` `moderator` `viewer`) · `content_status` (`draft`
`published` `archived`) · `registration_status` (`pending` `approved` `rejected`) ·
`gender` (`male` `female`)

### Tables

**Identity** — `profiles` (1:1 with `auth.users`, holds `role`, `is_active`).

**Storage** — two public buckets: `media` (editorial images, 10 MB, JPEG/PNG/WebP/AVIF)
and `scores` (the repertoire PDFs, 50 MB, `application/pdf` only). They stay separate
because widening `media` to admit documents would widen it for every editorial upload.

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
| News / gallery / videos | ● | ● | ○ | ○ |
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
   read layer behind it · ✅ About · ✅ Regulations
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
    - ✅ Judges · winners · partners · events · videos · gallery — one
      descriptor registry (`lib/admin/entities.ts`) rendered by one generic list and
      one generic form through `/admin/[entity]`
    - ✅ Users — role and activation, last-admin and self-lockout guards, invitations
    - ✅ Settings — per-group JSONB save; `smtp` deliberately excluded
    - ✅ Media — `<ImageUpload>` on every `*_path` field (cover, portrait, logo,
      branding), uploading straight from the browser to the `media` bucket
    - ✅ Photos inside an album — bulk upload, per-locale alt text and caption,
      ordering, delete (row and object), rendered under the album form
    - ❌ Pages — removed. The site has no free-form editorial pages, so the module was a
      menu entry that only ever opened an empty list

**Removing `pages` from the registry removed the module.** `/admin/pages` now 404s,
because the registry is the whitelist for `/admin/[entity]`. Two consequences are worth
stating rather than discovering:

- The `pages` **table, RLS and public routes are untouched** — `/[locale]/p/[slug]` and
  its sitemap entries still work; they simply have no way to be filled from the panel any
  more. The table held no rows when the module was removed, so nothing that existed was
  lost. The Regulations page no longer reads from it at all: its text now lives in the
  dictionaries (see §4). What remains dangling is the footer's `/p/privacy` and
  `/p/terms`, which can only ever 404 — give them a home elsewhere or drop them.
- **The generic form no longer carries Tiptap.** `pages` was the only descriptor with a
  `richtext` field, so the type and its branch went with it — `/admin/[entity]/[id]` fell
  from 339 kB to 213 kB of first-load JavaScript. The article editor is unaffected; it
  was never rendered by this registry.

**Uploads do not pass through the server.** `lib/supabase/upload.ts` writes to Storage
with the editor's own browser session, so `media_editor_write` decides whether an upload
is allowed and a 6 MB photograph never enters a Server Action — whose body is capped at
1 MB by default. Intrinsic dimensions are read from the file before it is sent and stored
on `photos.width/height`, which is what lets the public gallery reserve the right box and
avoid layout shift; the server would otherwise have to download the object back to learn
them. The bucket's limits (10 MB, JPEG/PNG/WebP/AVIF) are mirrored as constants in
`lib/supabase/storage.ts` so the UI can refuse a file before spending a round trip on it
— the bucket remains the authority, and the two must be changed together.

**Alt text gates a photograph, not decorates it.** The public album query drops any photo
with no alt text in any locale rather than emitting `alt=""`, which would tell a screen
reader that a festival photograph is ornamental. The admin panel therefore flags such
photos in place and says what the consequence is, rather than letting an editor discover
it from an empty gallery.

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
11. ✅ Regulations and repertoire — the approved «Положение» in three languages, the
    reference lists rebuilt from its § IV, and the 24 supplied scores published from the
    `scores` bucket at `/[locale]/notes`
12. SEO, performance, security passes
13. Docs, typecheck, lint, production build
