'use server';

import { revalidatePath } from 'next/cache';

import { requirePermission } from '@/lib/auth/session';
import { locales } from '@/lib/i18n/config';
import { createServerSupabase } from '@/lib/supabase/server';
import { sanitizeHtml } from '@/lib/utils/sanitize';
import { toSlugOrFallback } from '@/lib/utils/slug';
import { newsSchema } from '@/lib/validation/news';

export type NewsSaveResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'invalid' | 'duplicate_slug' | 'error'; message?: string };

const UNIQUE_VIOLATION = '23505';

/**
 * Invalidate the public pages an article appears on.
 *
 * `revalidatePath` with a *route pattern* (`'/[locale]/news'`, type `'page'`) clears
 * every locale in one call, which is what we want — publishing an article should not
 * leave the Russian index stale until its hourly revalidate expires.
 *
 * ARCHITECTURE §7 calls this "tag-based invalidation". Tags would need every read to go
 * through `fetch` or `unstable_cache`; the queries here use the Supabase client
 * directly, so path invalidation is the accurate mechanism. Same effect, fewer moving
 * parts — recorded so the doc and the code do not quietly disagree.
 */
function revalidateNews(slug?: string) {
  revalidatePath('/[locale]', 'page');
  revalidatePath('/[locale]/news', 'page');
  if (slug) revalidatePath(`/[locale]/news/${slug}`, 'page');
  revalidatePath('/[locale]/news/[slug]', 'page');
  revalidatePath('/sitemap.xml');
  revalidatePath('/admin/news');
}

export async function saveNews(input: unknown): Promise<NewsSaveResult> {
  await requirePermission('content.manage');

  const parsed = newsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: 'invalid' };

  const data = parsed.data;
  const supabase = await createServerSupabase();

  const slug = data.slug?.trim() || toSlugOrFallback(data.translations.uz?.title ?? '', 'news');

  const row = {
    slug,
    category_id: data.categoryId || null,
    cover_path: data.coverPath || null,
    status: data.status,
    // The CHECK in 0003 refuses a published row with no date; the schema already
    // guarantees one is present, so this only normalises the empty string.
    published_at: data.publishedAt || null,
    is_featured: data.isFeatured,
  };

  let newsId = data.id;

  if (newsId) {
    const { error } = await supabase.from('news').update(row).eq('id', newsId);
    if (error) {
      if (error.code === UNIQUE_VIOLATION) return { ok: false, reason: 'duplicate_slug' };
      console.error('[admin:news-update]', error.message);
      return { ok: false, reason: 'error', message: error.message };
    }
  } else {
    const { data: created, error } = await supabase
      .from('news')
      .insert(row)
      .select('id')
      .single();

    if (error || !created) {
      if (error?.code === UNIQUE_VIOLATION) return { ok: false, reason: 'duplicate_slug' };
      console.error('[admin:news-insert]', error?.message);
      return { ok: false, reason: 'error', message: error?.message };
    }
    newsId = created.id;
  }

  // Only locales with a title are written. An empty translation row would satisfy the
  // fallback chain's `find` and shadow the locale that actually has content.
  const translationRows = locales
    .filter((locale) => data.translations[locale]?.title?.trim())
    .map((locale) => {
      const t = data.translations[locale]!;
      return {
        news_id: newsId!,
        locale,
        title: t.title.trim(),
        excerpt: t.excerpt?.trim() || null,
        // Sanitised on write as well as on render — ARCHITECTURE §6. A compromised
        // editor account should not be able to store a script tag at all.
        body: sanitizeHtml(t.body ?? ''),
        seo_title: t.seoTitle?.trim() || null,
        seo_description: t.seoDescription?.trim() || null,
      };
    });

  if (translationRows.length) {
    const { error } = await supabase
      .from('news_translations')
      .upsert(translationRows, { onConflict: 'news_id,locale' });

    if (error) {
      console.error('[admin:news-translations]', error.message);
      return { ok: false, reason: 'error', message: error.message };
    }
  }

  // Clear translations the editor emptied. Without this, deleting the English title in
  // the form would leave the previous English article live on the public site.
  const keptLocales = translationRows.map((t) => t.locale);
  const droppedLocales = locales.filter((locale) => !keptLocales.includes(locale));

  if (droppedLocales.length) {
    await supabase
      .from('news_translations')
      .delete()
      .eq('news_id', newsId)
      .in('locale', droppedLocales);
  }

  revalidateNews(slug);
  return { ok: true, id: newsId! };
}

export async function deleteNews(id: string, slug: string): Promise<NewsSaveResult> {
  await requirePermission('content.manage');

  const supabase = await createServerSupabase();
  // Translations go with it: `news_translations.news_id` is ON DELETE CASCADE.
  const { error } = await supabase.from('news').delete().eq('id', id);

  if (error) {
    console.error('[admin:news-delete]', error.message);
    return { ok: false, reason: 'error', message: error.message };
  }

  revalidateNews(slug);
  return { ok: true, id };
}

/** One-click publish / unpublish from the list, without opening the editor. */
export async function setNewsStatus(
  id: string,
  slug: string,
  status: 'draft' | 'published' | 'archived',
): Promise<NewsSaveResult> {
  await requirePermission('content.manage');

  const supabase = await createServerSupabase();

  if (status === 'published') {
    // Stamp the date only when there is not one already. Overwriting it would reset an
    // article's dateline every time it was unpublished and republished — and
    // `published_at DESC` is the ordering of every public list, so a small edit would
    // silently jump an old article back to the top.
    //
    // `.is('published_at', null)` makes that a single conditional statement rather than
    // a read-then-write race.
    const { error: stampError } = await supabase
      .from('news')
      .update({ published_at: new Date().toISOString() })
      .eq('id', id)
      .is('published_at', null);

    if (stampError) {
      console.error('[admin:news-status]', stampError.message);
      return { ok: false, reason: 'error', message: stampError.message };
    }
  }

  const { error } = await supabase.from('news').update({ status }).eq('id', id);

  if (error) {
    console.error('[admin:news-status]', error.message);
    return { ok: false, reason: 'error', message: error.message };
  }

  revalidateNews(slug);
  return { ok: true, id };
}
