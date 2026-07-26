import { ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { NewsForm, type NewsFormValue } from '@/components/layout/news-form';
import { Button } from '@/components/ui/button';
import { getAdminDictionary, getAdminLocale } from '@/lib/auth/admin-locale';
import { requirePermission } from '@/lib/auth/session';
import { localizeHref } from '@/lib/i18n/config';
import { getAdminNews, listNewsCategoryOptions } from '@/server/queries/admin-news';

export default async function AdminEditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission('content.manage');

  const { id } = await params;
  const [d, locale] = await Promise.all([getAdminDictionary(), getAdminLocale()]);

  const [record, categories] = await Promise.all([
    getAdminNews(id),
    listNewsCategoryOptions(locale),
  ]);

  if (!record) notFound();

  const initial: NewsFormValue = {
    id: record.id,
    slug: record.slug,
    categoryId: record.categoryId ?? '',
    coverPath: record.coverPath ?? '',
    status: record.status,
    publishedAt: record.publishedAt ?? '',
    isFeatured: record.isFeatured,
    translations: record.translations,
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="-ms-3">
        <Link href="/admin/news">
          <ArrowLeft className="rtl:rotate-180" />
          {d.admin.news.title}
        </Link>
      </Button>

      <AdminPageHeader
        className="mt-4"
        title={d.admin.news.editArticle}
        description={`/${record.slug}`}
        actions={
          record.status === 'published' ? (
            <Button asChild variant="outline" size="sm">
              <Link
                href={localizeHref(`/news/${record.slug}`, locale)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink />
                {d.admin.nav.viewSite}
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mt-8">
        <NewsForm initial={initial} categories={categories} dictionary={d} />
      </div>
    </div>
  );
}
